import * as ts from "typescript"
import { flatMap, defaults, last, reject, concat } from "lodash"
import * as util from "util"

/**
 * decorator name for generating generators
 */
export const RTJS_DECORATOR = "rtjs"
export const RTJS_MODULE_NAME = "rtjs"
/**
 * name for the global budget variable
 */
export const RTJS_BUDGET_IDENTIFIER = "RTJS_BUDGET"

/**
 * AST transformation config object
 */
export interface TransformConfig {
    forLoops: {
        /**
         * enable transformation on for-loops
         */
        transform: boolean,
        /**
         * enable yield statements before the loop
         */
        beforeLoop: boolean,
        /**
         * disable nested loop-yields
         */
        onlyBeforeTopLevelLoops: boolean,
        /**
         * enable yields inside the loop body
         */
        insideLoop: boolean
    },
    whileLoops: {
        /**
         * enable transformation on while loops
         */
        transform: boolean
    },
    doLoops: {
        /**
         * enable transformation on do loops
         */
        transform: boolean
    },
    callStatements: {
        /**
         * enable yield statements before a ```call``` statement
         */
        insertYieldBeforeCall: boolean
    },
    ifStatements: {
        /**
         * enable yields before ```if``` statements
         */
        beforeIfStatements: boolean
    }
}

/**
 * defaults for the transformation config objects
 */
export const DEFAULT_TRANSFORM_CONFIG: Readonly<TransformConfig> = Object.freeze({
    forLoops: {
        transform: true,
        beforeLoop: true,
        onlyBeforeTopLevelLoops: true,
        insideLoop: true
    },
    whileLoops: {
        transform: true
    },
    doLoops: {
        transform: true // no in use
    },
    callStatements: {
        insertYieldBeforeCall: true
    },
    ifStatements: {
        beforeIfStatements: false
    }
})

/**
 * a FunctionLike is a method OR function - both are possible canidates for generating a generator
 */
type FunctionLike = ts.MethodDeclaration | ts.FunctionDeclaration

let rtjsMethods: number[] = []

/**
 * returns a single yield statement with the message Scheduler::Continue
 * @returns ast objects for ```yield SchedulerMessage.Continue```
 */
function createYieldStatement(): ts.Statement {
    let propertyAccess = ts.createPropertyAccess(ts.createPropertyAccess(ts.createThis(), "SchedulerMessage"), "Continue")
    let yieldExpression = ts.createYield(propertyAccess)

    return ts.createExpressionStatement(yieldExpression)
}

/**
 * returns a single return statement with Scheduler::TerminateTask message; indicates, that the task is finished
 * @returns ast objects for ```return SchedulerMessage.TerminteTask```
 */
function createReturnStatement(): ts.Statement {
    let propertyAccess = ts.createPropertyAccess(ts.createPropertyAccess(ts.createThis(), "SchedulerMessage"), "TerminateTask")
    return ts.createReturn(propertyAccess)
}

/**
 * modify the list of statements in a block
 * @param config configuration variable
 * @param block the block of statements to be modified
 */
function modifyBlock(config: TransformConfig, block: ts.Block): ts.Block {
    block.statements = modifyStatementList(config, block.statements)
    return block
}

/**
 * returns property access of rtjs's budget variable
 * @returns ```this.rtjs.RTJS_BUDGET```
 */
function createRTJSBudget(): ts.Expression {
    return ts.createPropertyAccess(
        ts.createPropertyAccess(
            ts.createPropertyAccess(
                ts.createThis(), "rtjs"),
            "scheduler"),
        RTJS_BUDGET_IDENTIFIER)
}

/**
 * returns a budgeted version of the yield statement
 * @returns ```if ( --this.rtjs.RTJS_BUDGET < 0 ) { yield this.Schedulermessage.Continue }```
 */
function createBudgetedYieldStatement(): ts.IfStatement {
    let checkExpression = ts.createBinary(
        ts.createPrefix(ts.SyntaxKind.MinusMinusToken,
            createRTJSBudget()
        ),
        ts.createToken(ts.SyntaxKind.LessThanEqualsToken),
        ts.createLiteral(0)
    ) // creates (( --rtjs.RTJS_BUDGET ) > 0)

    let thenBlock = ts.createBlock([createYieldStatement()])
    return ts.createIf(checkExpression, thenBlock)
}

/**
 * modifies for-loops according to the config variable
 * @param config configuration variable
 * @param forStatement AST node identifying the for-loop-statement
 * @returns <budgetYield> <for ( ..; ..; ..)> { <bugetYield> <forbody>}
 */
function modifyFor(config: TransformConfig, forStatement: ts.ForStatement): ts.Statement[] {
    forStatement.statement = modifyBlock(config, forStatement.statement as ts.Block)

    if (config.forLoops.transform) {
        // transform if loops
        if (config.forLoops.insideLoop) {
            let yieldPoint = createBudgetedYieldStatement()
            let block = forStatement.statement as ts.Block
            forStatement.statement = ts.updateBlock(block, [yieldPoint as ts.Statement].concat(block.statements))
        }
        if (config.forLoops.beforeLoop) {
            if (config.forLoops.onlyBeforeTopLevelLoops) {
                for (let parent = forStatement.parent; parent != undefined; parent = parent.parent) {
                    if (ts.isForStatement(parent)) {
                        return [forStatement]
                    }
                }
            }
            return [createBudgetedYieldStatement(), forStatement]
        }

        return [forStatement]
    }
    else {
        // leave everything as it is
        return [forStatement]
    }
}

/**
 * modifies while-loops according to the config variable
 * @param config configuration variable
 * @param whileStatement AST node identifying the while-loop-statement
 * @returns <while ( ... )> { <bugetYield> <whilebody>}
 */
function modifyWhile(config: TransformConfig, whileStatement: ts.WhileStatement): ts.Statement[] {
    whileStatement.statement = modifyBlock(config, whileStatement.statement as ts.Block)

    if (config.whileLoops.transform) {
        // transform if loops
        let yieldPoint = createBudgetedYieldStatement()
        let block = whileStatement.statement as ts.Block
        whileStatement.statement = ts.updateBlock(block, [yieldPoint as ts.Statement].concat(block.statements))
        return [whileStatement]
    }
    else {
        // leave everything as it is
        return [whileStatement]
    }
}

/**
 * modify if statements according to the config variable
 * @param config configuration variable
 * @param ifStatement the AST node identifying the if-statement
 * @returns <budgetYield> <if (..)> {} [else {}]
 */
function modifyIf(config: TransformConfig, ifStatement: ts.IfStatement): ts.Statement[] {
    if (config.ifStatements.beforeIfStatements) {
        ifStatement.thenStatement = modifyBlock(config, ifStatement.thenStatement as ts.Block)
        if (ifStatement.elseStatement) {
            ifStatement.elseStatement = modifyBlock(config, ifStatement.elseStatement as ts.Block)
        }
        return [createBudgetedYieldStatement(), ifStatement]
    } else {
        return [ifStatement]
    }
}

/**
 * creates an expression like ```yield this.rtjs.spawnTaskFromFn(node.bind(node, SIZE), this.name + "->" + node.name, this.priority)```
 */
function createTaskSpawn(node: ts.CallExpression): ts.Node {
    let thisRtjsProperty = ts.createPropertyAccess(ts.createThis(), "rtjs") // this.rtjs
    let spawnTaskFromFnProperty = ts.createPropertyAccess(thisRtjsProperty, "spawnTaskFromFn") // this.rtjs.spawnTaskFromFn

    let nodeIdentifier = node.expression
    let nodeArgs = ts.createArrayLiteral(node.arguments)

    let thisNameProperty = ts.createPropertyAccess(ts.createThis(), "name")
    let taskName = ts.createBinary(
        thisNameProperty,
        ts.createToken(ts.SyntaxKind.PlusToken),
        ts.createPropertyAccess(nodeIdentifier, "name")
    )  // this.name + node.name

    let taskPrio = ts.createPropertyAccess(ts.createThis(), "priority") // this.priority
    let taskDeadline = ts.createPropertyAccess(ts.createThis(), "deadline") // this.deadline

    let taskConfigProps = ts.createNodeArray([
        ts.createPropertyAssignment("name", taskName),
        ts.createPropertyAssignment("priority", taskPrio),
        ts.createPropertyAssignment("deadline", taskDeadline),
    ])
    let taskConfig = ts.createObjectLiteral(taskConfigProps, false)

    let args = ts.createNodeArray([nodeIdentifier, nodeArgs, taskConfig])

    let callExpression = ts.createCall(spawnTaskFromFnProperty, undefined, args)

    let yieldExpression = ts.createYield(callExpression)
    return yieldExpression
}

/**
 * inserts a budgeted yield before function calls
 * @param config configuration variable
 * @param expressionStatement the statement to be altered
 */
function modifyExpresionStatement(config: TransformConfig, expressionStatement: ts.ExpressionStatement): ts.Statement[] {
    if (ts.isCallExpression(expressionStatement.expression)) {
        return [createBudgetedYieldStatement(), expressionStatement]
    }
    return [expressionStatement]
}

/**
 * modifies a list of statements
 * @param config configuration variable
 * @param statements the list of statements of the block
 * @param additional list of statements to be concatted after the modification of statements
 * @returns the new list of statements
 */
function modifyStatementList(config: TransformConfig, statements: ts.NodeArray<ts.Statement>, additional: ts.Statement[] = []): ts.NodeArray<ts.Statement> {
    return ts.createNodeArray(flatMap(statements, (statement => {
        if (ts.isBlock(statement)) {
            return modifyBlock(config, statement as ts.Block)
        }
        else if (ts.isWhileStatement(statement)) {
            return modifyWhile(config, statement as ts.WhileStatement)
        }
        //else if ( ts.isDoStatement ( statement ) {
        //return modifyDoStatement ( config, statement as ts.DoStatement )
        //}
        else if (ts.isForStatement(statement)) {
            return modifyFor(config, statement as ts.ForStatement)
        }
        else if (ts.isIfStatement(statement)) {
            return modifyIf(config, statement as ts.IfStatement)
        }
        else if (ts.isExpressionStatement(statement)) {
            return modifyExpresionStatement(config, statement as ts.ExpressionStatement)
        }
        return statement
    })).concat(additional)) as ts.NodeArray<ts.Statement>
}

/**
 * modifies a function according to the config values
 * @param ctx
 * @param config configuration variable
 * @param node the function node
 * @returns
 */
function modifyFunction(ctx: ts.TransformationContext, config: TransformConfig, node: FunctionLike) {
    let body = node.body
    if (!body) { return }

    let visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        // await -> yield
        if (ts.isAwaitExpression(node)) {
            let yieldExpression = ts.createYield(node.expression)
            yieldExpression.parent = node.parent
            return yieldExpression
        }


        if (ts.isCallExpression(node)) {
            let comment = getLeadingCommentForNode(node.parent.parent)
            if (comment == `@${RTJS_DECORATOR}`) {
                return createTaskSpawn(node)
            }
        }

        return ts.visitEachChild(node, visitor, ctx)
    }
    body = ts.visitNode(body, visitor)
    body.statements = modifyStatementList(config, body.statements, [createReturnStatement()])
    node.body = body
}

/**
 * returns the comment string before the node
 * @param node node for which to get the comment
 * @returns comment string
 */
function getLeadingCommentForNode(node: ts.Node): string | undefined {
    let sourceText = node.getSourceFile().getFullText()
    let commentToken = last(ts.getLeadingCommentRanges(sourceText, node.getFullStart()))
    if (commentToken) {
        return sourceText
            .substring(
                commentToken.pos + 2,
                commentToken.kind === ts.SyntaxKind.SingleLineCommentTrivia ? commentToken.end : commentToken.end - 2
            )
            .trim()
    }
}

/**
 * tries to find the decorator RTJS_DECORATOR for the given node, if found: add node to RTJS-function list
 * @param node find the decorator for this node
 * @returns node if the decorator was found, nothing if not
 */
function asRTJSFunctionLike(node: FunctionLike): FunctionLike | undefined {
    if (node.decorators) {
        // find all decorators which are RTJS_DECORATOR
        let newDecorators = reject(node.decorators, d =>
            ts.isIdentifier(d.expression)
            && d.expression.text == RTJS_DECORATOR
        )

        // if RTJS_DECORATOR not found(?????)
        if (node.decorators.length === newDecorators.length) {
            return
        }
        node.decorators = ts.createNodeArray(newDecorators)

        // make generator and add to list of RTJS-functions
        ensureGeneratorFunction(node)
        rtjsMethods.push((node as any).id)
        return node
    }

    // try to scrape RTJS_DECORATOR from the comment above
    let comment = getLeadingCommentForNode(node)
    if (comment == `@${RTJS_DECORATOR}`) {
        ensureGeneratorFunction(node)
        rtjsMethods.push((node as any).id)
        return node
    }
}

/**
 * make the node a generator and remove the async keyword
 * @param node function-like to be evaluated
 */
function ensureGeneratorFunction(node: FunctionLike) {
    node.asteriskToken = ts.createNode(ts.SyntaxKind.AsteriskToken) as ts.AsteriskToken
    if (!node.modifiers) { 
        return
    }
    let newModifiers = reject(node.modifiers, m => m.kind === ts.SyntaxKind.AsyncKeyword)
    node.modifiers = ts.createNodeArray(newModifiers)
}

/**
 * starts the transformation, looks for RTJS_DECORATOR and starts transforming the decorated function-likes
 * @param config configuration variable
 */
export function transform(config: TransformConfig = DEFAULT_TRANSFORM_CONFIG) {
    return function(ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
        let visitor: ts.Visitor = (node: ts.Node): ts.Node => {
            // is the node a method or function declaration
            if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) {
                // transform to generator and recurse into the function
                let methodNode = asRTJSFunctionLike(node as ts.MethodDeclaration)
                if (methodNode) {
                    modifyFunction(ctx, config, methodNode)
                }
            }

            // recurse over the children
            return ts.visitEachChild(node, visitor, ctx)
        }

        return (sf: ts.SourceFile) => ts.visitNode(sf, visitor)
    }
}

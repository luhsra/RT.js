   if (IS_OSEK) {
       __awaiting.push(new Promise((res, reject) => {
           try {
               rtjs.start()
               res()
           } catch (error) {
               reject(error)
           }
       }))
   }

   // Start OSEK and wait until all jobs are scheduled
   await Promise.all(__awaiting)


   let __end = rtjs.getTime()

    let output = JSON.stringify({
        config: osekConfig,
        totalTime: Number(__end - __start),
        schedulerTime: rtjs.scheduler.schedulerTime,
        jobs: results
    })

    if (process.env.TRACE_FILE) {
        fs.writeFileSync(process.env.TRACE_FILE, output)
    }

    process.stdin.destroy()
    process.exit(0)
}

main().catch(e => {
    console.error(e);
    process.exit(1)
})

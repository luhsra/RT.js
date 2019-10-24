#!/usr/bin/python3

import pandas as pd

df = pd.read_csv('context_switch_overhead.csv')

print(df[['name', 'Mean', 'Std', 'Per Yield']])

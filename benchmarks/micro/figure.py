#!/usr/bin/python3

import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('context_switch_overhead_budgeted.csv')
df.plot(x='budget', y='Per Yield',style='.-')
plt.show()

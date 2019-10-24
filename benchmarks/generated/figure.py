#!/usr/bin/python3

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

fig, (ax0, ax1) = plt.subplots(nrows=2)
plt.rcParams["errorbar.capsize"] = 3

data = pd.read_csv('benchmark_output.csv')

# Calculate Relative columns
data['miss-ratio'] = data['missedDeadline'] / data['jobs']
data['overhead'] = data['schedulerTime'] / data['taskTime']

# Data Analysis: Miss Deadline Ratios
table = pd.pivot_table(data, values='miss-ratio', index=['variant'],
                       columns=['utilization'], aggfunc=np.sum).T
table = table[['raw', 'FP', 'EDF']] # Reorder Columns

buckets = np.arange(0, 1.01, 0.10)
factor = pd.cut(table.index, buckets, labels=['%.2f'%x for x in buckets[:-1]])

mean = table.groupby(factor).aggregate('mean')
std = table.groupby(factor).aggregate('std')


mean.plot.bar(ax=ax0, log=True, yerr=std)
ax0.yaxis.grid(True)
ax0.set_xlabel("Utilization")
ax0.set_ylabel("Deadline-Miss Ratio")

# Data Analysis: Overheads
table = pd.pivot_table(data, values='overhead', index=['variant'],
                       columns=['utilization'], aggfunc=np.sum).T
table = table[['raw', 'FP', 'EDF']] # Reorder Columns

mean = table.groupby(factor).aggregate('mean')
std = table.groupby(factor).aggregate('std')

mean.plot.bar(ax=ax1, yerr=std,ylim=(0.9,1.2))
ax1.yaxis.grid(True)
ax1.set_xlabel("Utilization Factor")
ax1.set_ylabel("Scheduler-Overhead Factor")

plt.show()

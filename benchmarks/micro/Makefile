all:
	@echo "Usage: make [table | figure | recalculate]"

table:
	@./table.py

figure:
	@./figure.py


recalculate:
	rm -f context_switch_overhead.csv
	$(MAKE) context_switch_overhead.csv

%.csv: %.js
	node $<

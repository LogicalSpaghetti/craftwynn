### Goal: Calculate the chance of getting >x in a given stat for a crafted

for each id on each ing:\
floor(effectiveness\*round(min\*(100-rand)/100 + max*rand/100))\
rand = [0...100]\
/101\
to add two together, multiply every pair of number's chances together and add that to the chance of their sum in the product
    i.e. 25% chance of 2 and 50% chance of 3 => +12.5% chance of 5

0 1\
2 3\
4 5

touching indexes, faster than computing
```json
[
  [1,2],
  [0,3],
  [0,3,4],
  [1,2,5],
  [2,5],
  [3,4]
]
```
```json
[
  [3,4,5],
  [2,4,5],
  [1,5],
  [0,4],
  [0,1,3],
  [0,1,2]
]
```
Notes:
fnm use 24
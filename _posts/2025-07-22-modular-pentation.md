---
layout: posts
title:  "Modular pentation"
date:   2025-07-23 20:20:54
categories: Mathematics
tags: modmath cryptography writeups
excerpt: On very very big numbers that turn small
mathjax: true
---

* content
{:toc}

This was inspired by a challenge I did during SSMCTF 2025.

<br>

# Challenge


Challenge title: triplebaka
```python
from Crypto.Util.number import getPrime, bytes_to_long
from math import log2, floor

flag = "SSMCTF{??????????}" # number of ?s not necessarily accurate
secret = bytes_to_long(flag.encode('utf-8'))
bits = floor(log2(secret) + 1)

def baka(ba, ka):
    bakabaka = ba
    for bakabakabaka in range(ka-1):
        bakabaka = ba**bakabaka
    return bakabaka

def hyperbaka(ba, ka, bakabaka):
    if bakabaka == 1:
        return ba**ka
    elif ka == 0:
        return 1
    elif bakabaka == 2 and ba == ka:
        return baka(ba, bakabaka)
    else:
        bakabakabaka = hyperbaka(ba, ka-1, bakabaka)
        return hyperbaka(ba, bakabakabaka, bakabaka-1)

def triple_baka(n):
    if n == 1:
        return hyperbaka(3, 3, 4)
    else:
        return hyperbaka(3, 3, triple_baka(n-1))

TRIPLE_BAKA = triple_baka(64)

a = getPrime(bits // 2) + 1
b = getPrime(bits // 2)
x = getPrime(bits // 2)
m = getPrime(bits)

def get_next():
    global x
    x = (a * x + b) % m

print(f'{bits = }')

for i in range(1, TRIPLE_BAKA + 1):
    get_next()
    if i <= 10:
        print(i, x)

ct = secret ^ x
print(f'{ct = }')

# 1 10275910798653121436396833379154598008161
# 2 2068591239728841545706452127889450693176
# 3 26350147429806384823786121899280661716493
# 4 25358475244916002220884659082517978530071
# 5 12563752780567442975545946639227178025296
# 6 19642601882956204519785723889340847589962
# 7 6259116168994041128833294897342371591968
# 8 16406333604491605091556863399044907242384
# 9 25867766060185127305007083226436225587634
# ct = 8194779757417092844428719009359907728048
```

<br>

# Reversing the LCG


This is a challenge with many layers. I have no clue why I struggled so much with reverse engineering the LCG, but I followed a tutorial by [Violently Mild](https://www.violentlymild.com/posts/reverse-engineering-linear-congruential-generators/) and got it to work.

```python
x1 = 10275910798653121436396833379154598008161
x2 = 2068591239728841545706452127889450693176
x3 = 26350147429806384823786121899280661716493
x4 = 25358475244916002220884659082517978530071
x5 = 12563752780567442975545946639227178025296
x6 = 19642601882956204519785723889340847589962

t1 = x2 - x1
t2 = x3 - x2
t3 = x4 - x3
t4 = x5 - x4
t5 = x6 - x5

u1 = t3*t1 - t2**2
u2 = t4*t2 - t3**2
u3 = t5*t3 - t4**2

m = gcd(u2, u3)
a = ((x4 - x3) * pow(x3 - x2, -1, m)) % m
b = (x2 - a*x1) % m
x = ((x1-b) * pow(a, -1, m)) % m
```

which gives us the following result:
```
ct = 8194779757417092844428719009359907728048
m = 27071808322005969892390787400752803991921
a = 89758312926402224520
b = 113419724684347482281
x = 114484223952369800519
```

<br>

# Modular pentation?


Now we have all the parameters of the LCG, we just need to plug it into the `triple_baka()` function. But wait, The number is too massive! Observing the functions `baka`, `hyperbaka`, and `triple_baka` show that this is performing some kind of [hyperoperation](https://en.wikipedia.org/wiki/Hyperoperation), specifically pentation, which is basically recursively tetrating a number, which in turn is recursively exponentiating a number. 

Hence we needed another way to go about this. LCG operates in a finite field, which means eventually the generator will cycle back and reset. But the order of the LCG was too large to bruteforce. Googling 'modular pentation' brought up some interesting maths stack exchange posts, but they were all rather unhelpful. However, I then realised that the solution is more primitive than I thought. 

<br>

## Euler's theorem


Euler's theorem states that if $n$ and $a$ are coprime integers, then $a$ to the power of $\phi(n)$, which is the Euler's totient function of $n$ is equal to 1 modulo $n$.

$$
a^\phi(n) \; \equiv \; 1 \;(mod \; n)
$$

Now the solve path is to recursively find the Euler's totient of $m$ until it reaches 0, in which case we can ignore all later hyperoperations. This can be done trivially using FactorDB. The script is as follows:

```python
from factordb.factordb import FactorDB
cache = {27071808322005969892390787400752803991920: 10676206098819255732210451369310964952320, ... 4: 2} # truncated
import time
from math import gcd
def phi(n):
    if(n == 2):
        return 1
    if(n in cache.keys()):
        return cache[n]
    f = FactorDB(n)
    f.connect()
    while f.get_status() != "FF":
        time.sleep(3)
        f = FactorDB(n)
        f.connect()
    res = f.get_factor_from_api()
    phi = 1
    for num in res:
        phi *= (int(num[0]) - 1) * (int(num[0]) ** (num[1] - 1))
    cache[n] = phi
    return phi

# Tetration mod m
def tetration_mod(a, h, m):
    if m == 1:  
        return 0
    if h == 0:
        return 1
    if h == 1:
        return a % m

    # Reduce exponent using phi(m)
    exp = tetration_mod(a, h - 1, phi(m))
    # If a and m are not coprime, we must lift exponent by adding phi(m)
    if gcd(a, m) != 1:
        exp += phi(m)
    return pow(a, exp, m)

# triple_baka(n) mod m using recursive totients
def triple_baka(n, m):
    if n == 1:
        return tetration_mod(3, 3, m)
    return tetration_mod(3, triple_baka(n - 1, phi(m)), m)

m = 27071808322005969892390787400752803991921
ans = triple_baka(64, m - 1)
```

<br>

# Fast skipping in an LCG


Now we're all set. But wait! Before plugging everything into the LCG, we found an additional way to optimise the script with the help of this article: [Fast skipping in a Linear Congruential Generator](https://www.nayuki.io/page/fast-skipping-in-a-linear-congruential-generator). I won't go into the details on how it works but it's fascinating and very efficient. Like the title suggests, it skips through an LCG very fast. 

```python
def skip(x, a, b, m, n):
    a1: int = a - 1
    ma: int = a1 * m
    y: int = (pow(a, n, ma) - 1) // a1 * b
    z: int = pow(a, n, m) * x
    x = (y + z) % m
    return x

print(skip(x, a, b, m, ans))

state = 25614703427463734060673932856925318941645
print(long_to_bytes(ct^state))
```
yay!

<br>

# flag

`SSMCTF{b4kabaka!}`

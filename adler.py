#!/usr/bin/env python
'''A script to calculate adler32 checksum of given files'''

BLOCKSIZE=256*1024*1024
import sys
from zlib import adler32

def adler32_checksum(fname):
 asum = 0 
 f = open(fname, "rb")
 while True:
   data = f.read(BLOCKSIZE)
   if not data:
        break
   asum = adler32(data, asum)
   if asum < 0:
        asum += 2**32
 f.close()
 return asum

for fname in sys.argv[1:]:
  checksum = adler32_checksum(fname)
  print checksum

  # asum = 1
  # with open(fname) as f:
  #   while True:
  #     data = f.read(BLOCKSIZE)
  #     if not data:
  #   	  break
  #     asum = adler32(data, asum)
  #     if asum < 0:
  #       asum += 2**32

  # print hex(asum)[2:10].zfill(8).lower(), fname
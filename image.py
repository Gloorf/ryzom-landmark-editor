#!/usr/bin/python3
import requests
from pathlib import Path

url = "https://api.bmsite.net/maps/icon/{size}/{color}/{name}.png"
sizes = [16, 24, 32]
colors = [
  "f0f",
  "bbb",
  "666",
  "fff",
  "f60",
  "f30",
  "c00",
  "9c3",
  "3c0",
  "090",
  "9c3",
  "f90",
  "c63",
  "ff9",
  "960",
  "633",
  "c99",
  "360",
  "663",
  "cc3",
  "c39",
  "c39",
  "f06",
  "609",
  "369",
  "309",
  "306",
  "303",
  "6ff",
  "0cc"
]


def download_single(url):
    dst = url.replace("https://api.bmsite.net/maps/icon/", "images/")
    path = Path(dst).parent
    print(path)
    path.mkdir(parents=True, exist_ok=True)
    r = requests.get(url)
    with open(dst, 'wb') as f:
        f.write(r.content)


name = 'lm_marker'
for size in sizes:
    for color in colors:
        target = url.format(size=size, color=color, name=name)
        download_single(target)

import sys
p = sys.argv[1]
s = open(p, encoding="utf-8", newline="").read()
s = s.replace("\r\r\n", "\n").replace("\r\n", "\n").replace("\r", "\n")
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("normalized", p, s.count("\n"))

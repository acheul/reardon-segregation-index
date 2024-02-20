import sys, os
sys.path.append(os.path.dirname("../src"))

from segdex import estimate_Hp

if __name__ == "__main__":

  areas1 = [[80, 80, 70, 70], [50, 45, 40], [20, 20, 20, 10]]
  areas2 = [[80, 70, 50], [80, 70, 45, 20, 20], [40, 20, 10]]

  print(estimate_Hp(areas1))
  print(estimate_Hp(areas2))
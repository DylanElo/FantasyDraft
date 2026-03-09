import sys

def py_hash(player_id):
    return hash(player_id) % 1000000000

print(py_hash("abc"))

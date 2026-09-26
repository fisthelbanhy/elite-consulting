"""Lecture d'un dump phpMyAdmin/MySQL : renvoie les lignes de chaque table sous forme de dict.

Gère les chaînes échappées MySQL (\\' \\\\ \\n \\r \\0 \\Z '' ), NULL, nombres et les
INSERT multi-lignes `INSERT INTO `t` (`a`, `b`) VALUES (...), (...);`.
"""

import re
from collections import defaultdict
from pathlib import Path

_ECHAPPEMENTS = {"0": "\0", "n": "\n", "r": "\r", "t": "\t", "Z": "\x1a", "b": "\b"}
_INSERT = re.compile(r"INSERT INTO `(\w+)` \(([^)]*)\) VALUES\s*", re.S)


def _lire_valeurs(texte: str, i: int) -> tuple[list[list], int]:
    """Lit les tuples à partir de l'index i jusqu'au `;` final. Retourne (tuples, nouvel index)."""
    tuples: list[list] = []
    n = len(texte)
    while i < n:
        c = texte[i]
        if c == "(":
            i += 1
            ligne: list = []
            while True:
                while texte[i] in " \n\r\t":
                    i += 1
                c = texte[i]
                if c == "'":
                    i += 1
                    morceaux = []
                    while True:
                        c = texte[i]
                        if c == "\\":
                            suivant = texte[i + 1]
                            morceaux.append(_ECHAPPEMENTS.get(suivant, suivant))
                            i += 2
                        elif c == "'":
                            if texte[i + 1] == "'":
                                morceaux.append("'")
                                i += 2
                            else:
                                i += 1
                                break
                        else:
                            j = i
                            while texte[j] not in "\\'":
                                j += 1
                            morceaux.append(texte[i:j])
                            i = j
                    ligne.append("".join(morceaux))
                else:
                    j = i
                    while texte[j] not in ",)":
                        j += 1
                    brut = texte[i:j].strip()
                    i = j
                    if brut.upper() == "NULL":
                        ligne.append(None)
                    else:
                        try:
                            ligne.append(int(brut))
                        except ValueError:
                            try:
                                ligne.append(float(brut))
                            except ValueError:
                                ligne.append(brut)
                while texte[i] in " \n\r\t":
                    i += 1
                if texte[i] == ",":
                    i += 1
                    continue
                if texte[i] == ")":
                    i += 1
                    break
            tuples.append(ligne)
        elif c == ";":
            return tuples, i + 1
        else:
            i += 1
    return tuples, i


def lire_dump(chemin: str | Path) -> dict[str, list[dict]]:
    texte = Path(chemin).read_text(encoding="utf-8")
    tables: dict[str, list[dict]] = defaultdict(list)
    pos = 0
    while True:
        m = _INSERT.search(texte, pos)
        if not m:
            break
        table = m.group(1)
        colonnes = [c.strip().strip("`") for c in m.group(2).split(",")]
        tuples, pos = _lire_valeurs(texte, m.end())
        for t in tuples:
            if len(t) != len(colonnes):
                raise ValueError(f"{table}: {len(t)} valeurs pour {len(colonnes)} colonnes")
            tables[table].append(dict(zip(colonnes, t, strict=True)))
    return dict(tables)


if __name__ == "__main__":
    import sys

    data = lire_dump(sys.argv[1])
    for t, rows in sorted(data.items()):
        print(f"{t:30s} {len(rows)}")

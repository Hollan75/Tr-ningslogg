# Pass från datorn

Skriv eller redigera pass här på datorn och importera dem i appen:
**Inställningar → Pass från datorn → Klistra in & importera**.

## Arbetsflöde

1. Redigera en `.json`-fil i den här mappen (eller be Claude Code skapa en).
2. Få över texten till telefonen, t.ex. maila den till dig själv eller lägg den i en anteckning.
3. Kopiera all text på telefonen, klistra in i appen och tryck **Importera**.

Ett pass med samma namn som ett befintligt pass **uppdateras** – så du kan ändra här och importera igen.
Historiken påverkas inte.

## Format

```json
{
  "pass": [
    {
      "namn": "Pass A – Ben & säte",
      "övningar": [
        { "övning": "Goblet-knäböj", "set": 3, "reps": 10, "kg": 16, "vila": 90 },
        { "övning": "Musslan med miniband", "set": 2, "reps": 15 }
      ]
    }
  ]
}
```

| Fält | Krävs | Standard | Beskrivning |
|---|---|---|---|
| `namn` | ja | – | Passets namn |
| `övning` | ja | – | Övningens namn som det står i appen (stora/små bokstäver spelar ingen roll) |
| `set` | nej | 3 | Antal set |
| `reps` | nej | 10 | Reps per set (för tidsövningar: sekunder) |
| `kg` | nej | 0 | Startvikt |
| `vila` | nej | 90 | Vila i sekunder |

Om en övning inte finns i appen skapas den automatiskt som egen övning.
Övningsnamnen i det svenska biblioteket finns i `src/data/swedishExercises.ts`.

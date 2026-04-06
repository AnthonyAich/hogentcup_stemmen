# Excel Template - Hogentcup Stemmen

## Google Sheets Structuur

### Blad: "Stemmen"

| Kolom | Naam | Type | Beschrijving |
|-------|------|------|--------------|
| A | Tijdstempel | Datum/Tijd | Wanneer de stem is uitgebracht |
| B | Gebruiker ID | Getal | ID van de gebruiker (uit users.json) |
| C | Gebruiker Naam | Tekst | Naam van de gebruiker |
| D | Categorie | Tekst | Welke categorie werd gestemd |
| E | Stemmen | Tekst | Komma-gescheiden lijst van stemmen |
| F | Aantal Stemmen | Getal | Hoeveel opties werden geselecteerd |

### Voorbeeld Data

| Tijdstempel | Gebruiker ID | Gebruiker Naam | Categorie | Stemmen | Aantal |
|-------------|--------------|----------------|-----------|---------|--------|
| 2024-04-06 20:15:30 | 1 | Anthony Aichouche | Algemene Thema's | Teamwork & Samenwerking, Innovatie & Creativiteit, Duurzaamheid | 3 |
| 2024-04-06 20:18:45 | 5 | Laura Van Dyck | Ronde Thema's | Kennisquiz, Sportchallenge, Muziekquiz, Film & Serie Quiz, Puzzelruimte, Escaperoom, Cooking Battle, Debatwedstrijd, Tekenwedstrijd, Fotozoektocht, Karaoke competitie, Board Game Toernooi, Improv Theater, Codeerchallenge, Presentatieskills | 15 |

---

## Optionele Bladen voor Samenvatting

### Blad: "Samenvatting per Categorie"

| Categorie | Totaal Stemmen | Unieke Deelnemers |
|-----------|----------------|-------------------|
| Algemene Thema's | 0 | 0 |
| Ronde Thema's | 0 | 0 |
| Tafelrondes | 0 | 0 |
| Schiftingsvragen | 0 | 0 |

### Blad: "Samenvatting per Gebruiker"

| Gebruiker ID | Naam | Algemene Thema's | Ronde Thema's | Tafelrondes | Schiftingsvragen | Compleet |
|--------------|------|------------------|---------------|-------------|------------------|----------|
| 1 | Anthony Aichouche | ✓ | ✓ | ✓ | ✗ | 75% |

---

## Setup Instructies

1. Maak een nieuwe Google Sheet aan op https://sheets.google.com
2. Hernoem het eerste blad naar "Stemmen"
3. Kopieer de kolomheaders uit de tabel hierboven
4. Ga naar https://script.google.com
5. Maak een nieuw project aan
6. Plak de code uit `google-apps-script.gs`
7. Sla het project op
8. Klik op "Deploy" → "New deployment"
9. Kies type: "Web app"
10. Configureer:
    - **Execute as**: Me
    - **Who has access**: Anyone
11. Kopieer de Web App URL
12. Plak deze URL in `app.js` in de `submitVotes()` functie

---

## Formules voor Samenvatting

### Totaal Stemmen per Categorie:
```
=COUNTIF(Stemmen!D:D, "Algemene Thema's")
```

### Unieke Deelnemers per Categorie:
```
=COUNTUNIQUEIFS(Stemmen!C:C, Stemmen!D:D, "Algemene Thema's")
```

### Meest Gestemde Optie (voor Algemene Thema's):
```
=QUERY(Stemmen!E:E, "SELECT E, COUNT(E) WHERE D='Algemene Thema's' GROUP BY E ORDER BY COUNT(E) DESC LIMIT 5")
```

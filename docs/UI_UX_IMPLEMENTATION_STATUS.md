# Lokalna UI/UX implementacija — 12. novembar 2026.

Implementiran je prihvaćeni pravac A iz [plana](UI_UX_PLAN.md), na osnovu korisnikovog izričitog aktiviranja [implementacionog prompta](UI_UX_IMPLEMENTATION_PROMPT.md). Ovo ne pokreće novu tehničku pilot fazu niti objavljivanje aplikacije.

## Promene

- Jedinstvene semantičke promenljive za topli grafit, lavandu i svetloplavu selekciju, sa doslednom svetlom temom. Uklonjene su ponovljene definicije i stari plavi izuzeci. Ostaje instalirani Public Sans i zapamćena tema bez svetlog bljeska.
- Postojeći Base UI Button koristi se kroz ekrane; kontrole imaju najmanje 44 px, primarne mobilne akcije 48 px, vidljiv fokus, čitljiva disabled stanja i stabilnu širinu pri pravljenju linka. Aktivna navigacija ima `aria-current` i oblikovni indikator. Ispravljeni su nadnaslovi Tima i Podešavanja.
- Raspored ima jednu grupu pokazatelja, kompaktne kartice i fokusom upravljane „Opcije” sa zamenom, atomskom zamenom mesta, zaključavanjem i uklanjanjem. Vraćanje uklonjene smene, red čuvanja, retry, undo, revizije i odvojena objava su sačuvani. „Još” sadrži štampu; „Link za tim” je posebna sklopiva sekcija. Desktop nedelja koristi sedam kolona i lokalni skrol kada prostor nije dovoljan.
- Čista tipizirana [detekcija upozorenja](../src/lib/scheduling/warnings.ts) deli vremensku i intervalsku logiku sa generatorom. Prikuplja više smena u lokalnom danu, odsustva, nedeljnu nedostupnost, preklapanje, odmor, dnevne/nedeljne sate i neaktivnost; obrađuje susedne nedelje, ponoć i DST. Ne menja tvrda pravila generatora i ne uvodi nova pravila uloga.
- Upozorenja ostaju uz smene i u sažetku cele nedelje, nezavisno od filtera. Detalji i odlazak na smenu dostupni su tastaturom. „Sačuvano uz upozorenja” dolazi tek posle potvrđenog save-a. Privatne napomene ne ulaze u upozorenja, javni odgovor ili štampu.
- Jedno dugme „Napravi link za tim” koristi postojeći `rotate_team_link` i za prvi link i za zamenu. Sprečava dvoklik, čuva kandidata kroz retry/reload posle izgubljenog odgovora i razlikuje potvrđen neuspeh od nepoznatog ishoda. Ostaju Kopiraj, ručno kopiranje pri clipboard grešci i Opozovi. Objava i promena nedelje ne rotiraju token.
- Dostupnost ima semantičke tabove „Nedeljno” i „Odsustva i izuzeci”, sa strelicama/Home/End i očuvanim unosima. Izbor osobe se otvara po potrebi, početno prikazuje tri imena i nudi precizno proširenje/skupljanje. Ostaju više dana, 24:00, ceo/deo dana i privatna napomena, uz jasne vremenske greške. Jednostavna ruta zadržava samo Raspored i Odsustva i izuzetke.
- „Potrebni ljudi” ima stabilan redosled, ukupan broj, početne tri stavke, tačno „Prikaži još N” i „Prikaži manje”. Dodavanje ne širi listu; skrivena nova stavka ima eksplicitni prikaz. Brisanje čuva red tokom zahteva i vraća odgovarajući fokus. Tim ostaje na početnih deset, uz tačan broj sledeće grupe do 25.
- Štampa ima belu stranicu i svih sedam dana, bez navigacije, menadžerskih komandi i privatnih upozorenja. Print pravilo nadjačava i inline zapamćeni tamni `color-scheme`.

## Provere

Sve browser provere koriste eksplicitno instalirani Google Chrome. Supabase zahtevi u browser testovima presreću se izolovanim fixture-ima; novi fixture odbija nepoznate upise. SQL upisi izvršavani su samo u privremenom PGlite okruženju.

| Provera | Rezultat |
| --- | --- |
| `corepack pnpm lint` | Prolazi bez grešaka i upozorenja |
| `corepack pnpm typecheck` | Prolazi |
| `corepack pnpm build` | Produkcioni build prolazi |
| `corepack pnpm test:schema` | Replay migracija, tenant reference i anonimne zabrane prolaze |
| `corepack pnpm test:schedule` | Devet testova sa 10/25/50 zaposlenih: 100% pokrivenost i nula tvrdih povreda; razlikovanje dokazane male neizvodljivosti i limita pretrage; atomski save/swap, retry, revizije, DST, objava i backup/restore prolaze |
| `node tests/schedule-db.mjs` nakon dopune | Prvi rotate, ponavljanje istim tokenom, invalidacija starog i očuvanje objave, tuđi vlasnik i anonimni poziv provereni u PGlite-u |
| `corepack pnpm test:ui-ux` | Domenska upozorenja i Chrome regresije linka, tabova, lista, fokusa, save greške/retry-a, swap-a i undo-a prolaze |
| Chrome matrica | Raspored, Dostupnost sa izabranom osobom, Tim i Podešavanja: 320/390/768/1440 px × dark/light, 32 kombinacije; bez prelivanja stranice i pri 200% tekstu |
| Stvarni computed stilovi | Provereni uzorci teksta ≥ 4,5:1, granica polja ≥ 3:1 i vidljiva dugmad najmanje 44 × 44 px; tastaturni fokus 3 px i reduced motion prolaze |
| Stanja generatora u UI fixture-ima | Napredak, otkazivanje bez save-a, nepotpuno, limit, neispravne zaključane dodele i prazna priprema; ovo su kontrolisani UI worker fixture-i, dok pravi generator pokriva scheduling suite i postojeći manager browser test |
| Ostali ekrani | Prijava, kreiranje prostora i javni kalendar na sve četiri širine u obe teme, još 24 kombinacije |
| Postojeće browser regresije | `test:browser`, `test:schedule-browser` i `test:shared-browser` prolaze na produkcionom lokalnom buildu; ograničenja jednostavne rute ostaju |
| `corepack pnpm test:phone` | Lokalna E.164 normalizacija i odbijanje neispravnog broja prolaze |
| Štampa/PDF | Pravi Chrome PDF, sedam dana, bez upozorenja/komandi; završni PDF pregledan kroz Chrome PDF viewer |

Dokazi su u lokalnom ignorisanom [test-results folderu](../test-results/), posebno:

- [Tamni Raspored, 390 px](../test-results/ui-ux-raspored-dark-390.png)
- [Svetli Raspored, 1440 px](../test-results/ui-ux-raspored-light-1440.png)
- [Dostupnost, 390 px](../test-results/ui-ux-dostupnost-dark-390.png)
- [Opcije smene, 390 px](../test-results/ui-ux-options-dark-390.png)
- [Manifest browser dokaza](../test-results/ui-ux-evidence.json)
- [Chrome PDF](../test-results/ui-ux-week.pdf) i [pregled PDF-a](../test-results/ui-ux-pdf-viewer.png)

## Hostovana provera i granice

Read-only potvrđen je projekat `srpvabzbekenbuxxrbvr` (ShiftFlow, ACTIVE_HEALTHY, PostgreSQL 17.11), stvarni SQL za `rotate_team_link` i `revoke_team_link`, provera vlasnika i prava izvršavanja. `rotate_team_link` radi insert/upsert sa hashom tokena, dozvoljen je ulozi authenticated uz proveru vlasništva, a anon nema EXECUTE. Pročitana je aktuelna zvanična Supabase dokumentacija za RPC i privilegije, kao i instalirana/zvanična Next font i Base UI dialog dokumentacija.

Nisu testirani autentifikovani upisi na hostovanoj bazi, stvarna email/telefon registracija, stvarna invalidacija korisnikovog timskog linka, konkurentni upisi dve hostovane sesije, fizički telefon sa sistemskom tastaturom/notch safe-area ponašanjem niti potpuna screen-reader/WCAG revizija. Chrome desktop provere mobilnih širina ne predstavljaju te provere. Opšti izgled je vizuelno pregledan na reprezentativnim snimcima; ovo nije tvrdnja o ručnom pregledu svakog piksela svih snimaka.

Native time polja na ovom Windows/Chrome okruženju prikazuju AM/PM prema podešavanju pregledača/sistema; vrednosti i prikazi termina u rasporedu ostaju u 24-časovnom formatu. Nije uvedena zamena native kontrole niti se tvrdi da je njen format prisilno promenjen na svim uređajima.

Početno stanje je imalo samo dva nezabeležena UI/UX planska dokumenta; oni su sačuvani bez izmene. Nisu instalirani paketi, menjane zavisnosti ili lockfile, šema/RLS/Auth podešavanja, cenovnik ili algoritam prioritizacije. Nema commit-a, push-a ili deployment-a. Jedina promena skripti u package manifestu je novi `test:ui-ux`.

Lokalni pregled: `http://localhost:3001`. Za ponavljanje: `corepack pnpm build`, zatim `corepack pnpm start --port 3001` i test komande iz tabele. Browser testovi očekuju lokalni server na tom portu; alternativni URL zadaje `SHIFTFLOW_TEST_URL`.

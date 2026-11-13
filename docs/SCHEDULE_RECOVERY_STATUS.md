# Ispravke rasporeda — 13. novembar 2026.

Ovo je aktuelna odluka korisnika i zamenjuje staru apsolutnu zabranu dostupnosti iz prethodnih planskih dokumenata. Obuhvat je završen lokalno i na testnom Supabase projektu `srpvabzbekenbuxxrbvr`. Nema Git push-a ili deployment-a. Prethodne lokalne UI/UX izmene su sačuvane.

## Aktuelna pravila

- Generator prvo traži kompletan raspored uz dostupnost. Ako ga ne pronađe, automatski pokušava uz odstupanja od nedeljne dostupnosti, celodnevnog i delimičnog odsustva. Zapisi dostupnosti i privatne napomene ostaju netaknuti.
- Prioritet je pokrivenost, zatim manji broj dodela sa odstupanjem; tek potom postojeće ciljne satnice/preferencije. Mala iscrpna provera potvrđuje minimalan broj odstupanja. Velika pretraga je ograničena: popunjen rezultat ostaje popunjen ako dalja optimizacija dostigne limit, uz jasno obaveštenje da minimum odstupanja nije dokazan.
- Aktivan zaposleni iz istog prostora, nepreklapanje, maksimalni dnevni/nedeljni sati, minimalni odmor, zaključane dodele i tačne potrebe ostaju obavezni za oba automatska režima. Uloge su oznake, bez ograničenja kvalifikacija. Ručni override dogovor ostaje isti.
- Zaključana dodela sa konfliktom dostupnosti ostaje na svom mestu i dobija upozorenje. Druge neispravnosti zaključane dodele vraćaju jasan neuspeh. Nepotpuno rešenje i limit bez pronađenog kompletnog rešenja razlikuju se od uspeha i od dokazane neizvodljivosti.
- SQL prepoznaje eksplicitnu operaciju `generate_availability_override`, uz ista strukturna i ostala automatska pravila. Generisanje se ne predstavlja kao ručna zamena.
- Upozorenja se ponovo računaju iz podataka uz karticu, u sažetku cele nedelje i detaljima, nezavisno od filtera. Interfejs razlikuje popunjen raspored, popunjen uz upozorenja i nepotpun raspored. Kompletan raspored sa upozorenjima može da se objavi; nacrt ne menja timsku objavu do eksplicitne objave. Privatni razlozi odsustva ne ulaze u timski odgovor ili štampu.

## Čuvanje i oporavak

Panel rasporeda ostaje montiran tokom interne navigacije, sa memorijskim predlogom, nedeljom, undo stanjem i jednim serijalizovanim redom. Ključ panela sadrži korisnika i prostor; nedelja se ne može promeniti dok postoje upisi ili neuspešan predlog. Svaki posao pamti reviziju pripreme i ID operacije. Odjava/promena identiteta uklanja lokalne podatke i zaustavlja naredne poslove starog reda; već poslati atomski zahtev može završiti na serveru, ali ne menja novi ekran. Celokupan prostor se ne skladišti u browseru.

Ponovljeni `SIGNED_IN`/`TOKEN_REFRESHED` istog korisnika ne remontažu aplikaciju niti brišu otvorenu formu. Stvaran izlazak/promena naloga brišu privatno stanje; asinhroni odgovori prethodnog identiteta se ignorišu. Predlog preživljava promenu ekrana i fokus kartice, ali **ne** garantuje oporavak nakon zatvaranja kartice ili punog osvežavanja stranice pre uspešnog čuvanja.

„Sačuvano” se prikazuje tek posle odgovora baze. Retry koristi isti ID. „Učitaj sa servera” ne odbacuje neuspešan predlog; ponuđeni su nastavak čuvanja i zasebno odbacivanje sa potvrdom. Zastarela revizija ostaje konflikt, bez automatskog prepisivanja servera. Učitane dodele imaju stabilan redosled po vremenu i ključu smene.

## Nove migracije

Sve tri su prvo proverene replay-em u izolovanom PGlite-u, zatim primenjene na potvrđenom testnom projektu uz ponovno čitanje identiteta/šeme/funkcija pre svake primene. Ranije primenjene migracije nisu menjane.

| Migracija | Promena |
| --- | --- |
| [20261113085427_schedule_recovery_and_availability_fallback.sql](../supabase/migrations/20261113085427_schedule_recovery_and_availability_fallback.sql) | Legitimno otključavanje i stabilni UUID-evi dodela; zabrana prikrivenih promena; poređenje celog očekivanog skupa mesta pomoću `EXCEPT ALL`; eksplicitni automatski režim odstupanja samo od dostupnosti |
| [20261113090526_schedule_conflict_http_status.sql](../supabase/migrations/20261113090526_schedule_conflict_http_status.sql) | Poslovni konflikti revizija/pripreme pri čuvanju i objavi vraćaju `PT409` / HTTP 409 |
| [20261113090908_schedule_rpc_privileges.sql](../supabase/migrations/20261113090908_schedule_rpc_privileges.sql) | Uklanjanje nasleđenih širokih grantova nad šest RPC tabela rasporeda i sekvencom; authenticated zadržava samo potrebna čitanja uz postojeći RLS |

Stvarna API provera je otkrila PostgREST 14.18 petlju na starom `40001` kodu. Supabase dokumentuje [isti problem i upotrebu PT409](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b). Posle nove migracije konflikt vraća 409 bez petlje; ranije identifikovani backend procesi više nisu prisutni. Nije rađen reset ili restart projekta niti prekid proizvoljnih transakcija.

Nameravane dozvole i stvarni hostovani grantovi su upoređeni. Čist lokalni replay nije imao široke Supabase default grantove, dok ih je hostovana baza imala, uključujući TRUNCATE. Test treće migracije namerno reprodukuje te grantove pa proverava njihovo uklanjanje. RLS i vlasničke politike ostaju uključeni, interni validator nije javni RPC, a anonimni timski prikaz koristi isključivo token i bezbednu objavljenu projekciju.

Posle uklanjanja samo testnih fixture-a: ista početna **2 prostora, 6 nedelja, 84 dodele i 3 objave**. Dva nova testna Auth naloga i njihovi prostori su uklonjeni; njihove lozinke nisu ostale u dokazima. Nijedan prethodni poslovni podatak nije brisan.

## Izvršene provere

| Provera | Okruženje / rezultat |
| --- | --- |
| TypeScript, lint, produkcioni build | Prolaze; završni build uključuje novi životni ciklus panela i stabilan redosled dodela |
| `test:schema` | Izolovan SQL replay, bootstrap, tenant FK/čitanja/upisi i anonimne zabrane prolaze |
| `test:schedule` | Devet 10/25/50 scenarija imaju 100% pokrivenosti i nula tvrdih povreda; postojeći i novi regresioni SQL/domain scenariji prolaze |
| Novi domain scenariji | Tri vrste nedostupnosti, bez nepotrebnih odstupanja, iscrpni minimum za mali scenario, zaključana odsutna osoba, noć/susedni kontekst, sati, odmor, preklapanje i limit/neizvodljivost prolaze |
| Novi izolovani SQL | Lock/reload/unlock/replace/undo, stabilni UUID-evi, skrivena promena pod nazivom unlock, NULL/izmišljena/dupla/nedostajuća mesta, datumski override, rollback/revizija/objava, fallback uz ostala pravila i grantovi prolaze |
| Chrome recovery fixture | Simuliran neuspeh i navigacija tokom zahteva, zadržan predlog/retry istim ID-em, bez tihog reload gubitka, potvrđeno odbacivanje, stvarni Supabase auth događaji istog korisnika, fokus kartice, promena identiteta i odjava prolaze |
| `test:hosted-schedule` | Stvarne lozinka sesije kroz Supabase API; dva vlasnika vide samo svoj prostor; pravi konkurentni upisi dve nezavisne sesije daju jedan uspeh i jedan HTTP 409; otključavanje/undo/rollback/retry, automatski fallback, objava i anonimna privatnost prolaze |
| Chrome sa stvarnom bazom | Pravi worker, generisanje uz odsustva, save, lock/reload/unlock/replace/undo; pravi SQL konflikt, navigacija i svesno odbacivanje; jedan simuliran mrežni prekid pa uspešan retry protiv stvarnog SQL-a i reload prolaze |
| Šira Chrome UI matrica | Prolazi na završnom lokalnom produkcionom buildu: 32 kombinacije ekrana/teme/širine, 200% tekst, reduced motion, stvarni PDF; generator progress/cancel/invalid/incomplete/limit/empty i dodatna create/Auth/shared matrica takođe prolaze. Dev indikator je u ranijem pokušaju prekrio mobilnu navigaciju; završna provera nema taj problem |
| Ostale Chrome provere | Manager i jednostavna ruta na desktopu/mobilnim širinama; Auth na 390/768/1440; anonimni timski kalendar i navigacija nedelja prolaze. `test:hosted-anon` prolazi posle sužavanja grantova |

Testni Auth nalozi su izolovano pripremljeni u bazi radi testiranja postojećeg password login toka. Ovo **ne** dokazuje novu registraciju, email/SMS isporuku ili provider konfiguraciju; te postavke nisu menjane. Nisu provereni fizički mobilni uređaji, potpuna screen-reader revizija ili javni deployment. Pretraga ne garantuje globalno optimalnu pravičnost ili minimalan broj odstupanja kada iscrpi budžet.

Supabase security/performance advisors su ponovo pročitani. Ostaju očekivane napomene za RLS bez politika na internim RPC tabelama, dozvoljene SECURITY DEFINER API-je i neupotrebljene indekse. Postojeće upozorenje za [leaked-password zaštitu](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) nije menjano jer su Auth postavke izvan ovog obuhvata. [Namerno anonimno izvršavanje](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) ostaje samo za uski `read_team_week` API sa tokenom; privatne tabele nisu izložene.

Chrome dokazi su u ignorisanom `test-results/`, uključujući `hosted-schedule-recovery.png` i `schedule-recovery-account-switch.png`. `test:hosted-schedule` je opt-in i zahteva dva nova, eksplicitno odvojena testna naloga u lokalnom ignorisanom `hosted-schedule-fixtures.json`; namerno odbija već korišćene fixture prostore. Ne dodavati stvarne korisničke lozinke ili privilegovane ključeve.

## Ručna provera

1. Na rasporedu otvorite Opcije → Zaključaj. Osvežite stranicu, otvorite istu smenu → Otključaj → Zameni. Osvežite i proverite osobu i isti datum/termin; zatim probajte Poništi poslednju izmenu.
2. Privremeno blokirajte save zahtev u Chrome DevTools ili izazovite konflikt iz druge sesije. Izmenite smenu, otvorite Tim pa se vratite. Predlog mora ostati uz neuspešan status i Pokušaj ponovo. Učitaj sa servera mora zadržati predlog; Odbaci nesačuvani predlog mora tražiti svesnu odluku. U otvorenoj formi promenite fokus kartice i proverite da unos ostaje.
3. Zadajte potrebu koju može pokriti aktivan zaposleni, pa mu unesite odsustvo za taj termin. Generišite: ako ostala pravila dozvoljavaju, raspored je popunjen uz konkretno upozorenje. Objavite i proverite timski link: samo imena/termini/uloge, bez odsustva i privatne napomene.

Obuhvat se ovde završava. Ne pokretati druge medium/low stavke audita, objavljivanje ili naredne faze bez korisnikove instrukcije.

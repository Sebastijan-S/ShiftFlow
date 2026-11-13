# ShiftFlow — pripremljeni implementacioni prompt

**Status: nije izvršen.** Prisustvo ovog dokumenta nije nalog za implementaciju. Aktivirati ga tek kada korisnik izričito zatraži implementaciju prihvaćenog UI/UX plana. Odobrenje za izradu ovog prompta nije odobrenje za izvršavanje.

---

## Prompt za kasniju implementaciju

Implementiraj prihvaćeni ShiftFlow UI/UX plan iz [UI_UX_PLAN.md](./UI_UX_PLAN.md) u `C:\Users\Cebo\Documents\NewShiftFlow`.

### Autoritet i obim

1. Proveri aktivni folder, lokalni diff i važeći AGENTS.md, MASTER_PROMPT.md i aktivnu dokumentaciju. Sačuvaj nepovezan korisnički rad.
2. Ovaj UI/UX dogovor, zasnovan na korisnikovom izboru A, zamenjuje raniji light-blue-only vizuelni smer. To nije ponovno pokretanje ranijih pilot faza i nije obnova starog projekta.
3. Sprovedi samo izmene opisane ispod i u prihvaćenom planu. Korisniku prvo kratko navedi šta ćeš raditi, zatim autonomno dovrši odobrenu lokalnu implementaciju i njenu proveru.
4. Ne dodaj rezervacije, Premium ekrane, naplatu, knjigovodstvo, zalihe, radne sate za obračun ili druge buduće funkcije. Postojeći ekran je raspored smena, ne tok rezervacija.
5. Ne instaliraj ili nadograđuj pakete, ne menjaj Auth konfiguraciju, ne migriraj hostovanu bazu, ne commituj/pushuj i ne objavljuj aplikaciju samo zbog ovog naloga. Proveri posebnu postojeću autorizaciju ako se ispostavi da je takva radnja potrebna.

### Globalni dizajn

- Primeni precizne dark/light semantičke tokene, tipografiju, razmake, radijuse, fokus i stanja iz plana. Dark je default, izbor teme ostaje zapamćen.
- Public Sans i Phosphor već su instalirani; koristi ih. Ne menjaj font na osnovu procene generisane slike.
- Objedini ponovljene tokene i hardkodovane boje u [globals.css](../src/app/globals.css). Ukloni zamenjena pravila; ne slaži nove override zakrpe na postojeće.
- Unapredi i koristi postojeći [Button](../src/components/ui/button.tsx), uključujući dogovorene dodirne veličine. Ne uvodi paralelni sistem stilova za dugmad.
- Zajednički tokeni i komponente moraju se preneti na prijavu, kreiranje prostora, Tim, Podešavanja i objavljeni timski kalendar. Sačuvaj njihove postojeće funkcije i raspored osim eksplicitno dogovorenih promena.

### Raspored

- Sačuvaj položaj nedelje/filtera/glavnih akcija i postojeći desktop pregled nedelje, uz mobilni izbor dana.
- Tri kartice sa metrikama sažmi u jednu grupu. Čuvanje nacrta i objava moraju ostati jasno odvojeni.
- Kompaktna kartica smene: vreme, uloga, ime/status, zaključavanje/upozorenje i Opcije. Postojeće radnje Zameni, Zameni mesta, Zaključaj/Otključaj, Ukloni i vraćanje uklonjene smene ostaju dostupne dodirom i tastaturom.
- „Još” sadrži Štampaj/PDF. „Link za tim” je vidljiva sklopiva sekcija; ne duplirati kontrole deljenja u oba mesta.
- Sačuvaj čuvanje reda izmena, revizije, retry, undo i atomske zamene mesta. Ne menjaj datume/vremena radi zamene zaposlenog.
- Sačuvaj kompletno/nepotpuno/limit pretrage i progress/cancel ponašanje generatora. Ne pretvaraj warning u novo pravilo koje blokira dogovoreni ručni override.

### Upozorenja pri ručnim izmenama

- Napravi čistu, tipiziranu domensku detekciju uz [scheduling modul](../src/lib/scheduling/engine.ts), odvojenu od UI i baze. Deliti postojeću intervalsku/timezone logiku; ne razvodniti tvrde provere generatora.
- Prikupljati sve primenljive razloge, ne samo prvi: ista osoba u dve ili više smena u istom lokalnom danu čak i bez preklapanja; ceo/deo dana odsustva; nedeljna nedostupnost; preklapanje; odmor; dnevni/nedeljni maksimum; neaktivan zaposleni prema postojećim pravilima. Ne uvoditi nova pravila uloga.
- Pravilno obraditi noćne smene, kraj u ponoć, DST, susedne nedelje, otkazane i prazne smene. Deduplicirati razloge. Swap i undo ponovo računaju sve pogođene dodele.
- Posle potvrđenog save-a prikazati „Sačuvano uz upozorenja”, konkretan razlog i Poništi izmenu. Tokom pending-a reći „Čuvanje…”, pri neuspehu jasno prikazati grešku.
- Trajno označiti problematične smene ikonom i „Proveriti”, uz dostupne detalje. Oznake ponovo izračunati posle reload-a i promene podataka. Kratka notifikacija nije jedino mesto na kome se problem može saznati.
- Sažetak upozorenja obuhvata celu nedelju, i kada filter skriva problematičan dan. Razlozi odsustva i menadžerska upozorenja ne odlaze u javni timski odgovor ili privatne detalje na štampi.

### Jedno dugme za timski link

- Jedno dugme „Napravi link za tim” pravi prvi link ili zamenjuje aktivni. Ukloni zasebne Zameni postojeći link / Rotiraj link. Sačuvaj Kopiraj i Opozovi.
- Pre dugmeta objasni da pravljenje novog poništava prethodni. Posle uspeha: „Novi link je spreman. Prethodni više ne važi.” Ne kopiraj automatski.
- Koristi postojeći `rotate_team_link` koji već radi insert/update. Pre toga, uz Supabase skill i aktuelnu zvaničnu dokumentaciju, read-only proveri nameravani projekat, stvarnu funkciju i ovlašćenja. Nova migracija nije predviđena.
- Za pending/dvoklik spreči dupli poziv. Za retry tekuće operacije sačuvaj i ponovo upotrebi isti kandidat tokena; ne pravi sledeći token na tehnički retry. Razlikuj potvrđen uspeh, potvrđen neuspeh i nepoznat ishod.
- Ne proglašavaj nepotvrđeni token aktivnim niti prethodni sigurno važećim ako je odgovor izgubljen. Clipboard neuspeh ima poruku i ručno kopiranje kao alternativu.
- Obično čuvanje, prelazak na drugu nedelju i objava zadržavaju link. Testove zamene/invalidacije radi samo u izolovanim fixture-ima/PGlite; ne opozivaj stvarni link korisnika.

### Dostupnost i liste

- U punom prikazu Dostupnosti napravi tabove Nedeljno i Odsustva i izuzeci. Sačuvaj unos i izabranu osobu pri prebacivanju.
- Izabrano ime je jasno iznad editora, a pretraga i lista su dostupne otvaranjem izbora. Početno najviše tri imena; omogući jasno proširenje/skupljanje bez gubitka aktivne osobe.
- Sačuvaj više dana po unosu, Od/Do, 24:00, celu/delimičnu odsutnost i privatnu napomenu. Noćno uputstvo otvara se po potrebi. Vremenske validacije imaju jasnu poruku.
- Sažeta uneta dostupnost ostaje korisna za poređenje i ne seče se automatski na tri reda.
- Sačuvaj ograničen sadržaj rute [radni-raspored](../src/app/radni-raspored/page.tsx): u njoj nema nedeljne dostupnosti, Tima ili Podešavanja.
- Potrebni ljudi: broj svih stavki, početno najviše tri, tačno „Prikaži još N”, zatim „Prikaži manje”. Primeni pravila stabilnog redosleda, dodavanja, brisanja i fokusa iz plana. Ne proširuj i ne skroluj automatski zbog dodavanja.
- Tim zadržava pretragu i početnih deset; broj na kontroli proširenja mora odgovarati stvarno dodatoj grupi. Ne skrivaj raspored ili upozorenja ovim obrascem.

### Implementaciona disciplina

- Izdvajaj koherentne komponente; ne pretvaraj [workspace-app.tsx](../src/components/workspace-app.tsx) ili [schedule-panel.tsx](../src/components/schedule-panel.tsx) u sveobuhvatan ekran sa novim domenskim pravilima.
- Za verzijski zavisne Next.js/Base UI API-je proveri instaliranu verziju, lokalnu dokumentaciju i aktuelne zvanične izvore. Koristi postojeće instalirano okruženje bez naslepe instalacije.
- Čuvaj sve postojeće mehanizme tenant izolacije i integriteta. Upozorenja su savetodavna prezentacija, ne zamena za autorizaciju i validaciju baze.
- Dokumentuj rezultate i stvarne granice provere bez proglašavanja stare fixture provere dokazom novih promena.

### Provera i završetak

1. Sprovedi checklistu iz odeljka 12 [plana](./UI_UX_PLAN.md), uključujući sve specifične slučajeve upozorenja, linka i listi.
2. Pokreni odgovarajuće postojeće lint/typecheck/build, scheduling i schema/PGlite provere. Dodaj smislene regresione testove za novu logiku; ne testiraj samo reprodukciju CSS-a.
3. Google Chrome eksplicitno, nikada Brave: dark/light, 320/390/768/1440 px, tastatura, fokus, 200% tekst, safe area, native kontrole, meni/sheet i stvarna štampa/PDF. Svi upisi samo u jasno izolovanim fixture-ima.
4. Izveštaj: šta je promenjeno, zašto, koje provere su prošle, šta je ostalo neprovereno, screenshot dokazi i preostala ograničenja. Ne navoditi testove kao izvršene ako nisu pokrenuti.
5. Na kraju lokalne implementacije i provere stani. Ne pokreći Git objavu ili live deployment na osnovu ovog prompta.

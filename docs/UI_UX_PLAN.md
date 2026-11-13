# ShiftFlow — dogovoreni UI/UX plan, pravac A

## Status i granice

Faza 3 ovog UI/UX dogovora znači konačnu specifikaciju i pripremu implementacionog prompta. Implementacija nije pokrenuta. Ovo nije faza 3 ranijeg tehničkog pilot plana.

Korisnik je prihvatio pravac A, prikaz Dostupnosti sa dva taba, svetlu temu i dve dopune: automatsku zamenu timskog linka na zahtev i upozorenja pri ručnim izmenama. Ovaj dogovor ima prednost nad ranijim svetloplavim smerom u [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) i odredbom da se tamna tema ne razvija. Ostale projektne obaveze ostaju važeće.

Menjaju se postojeće prezentacione komponente i samo dogovorena ponašanja. Nema novih funkcija za rezervacije, knjigovodstvo, zalihe, obračune ili Premium ekrana. Pregledani projekat sadrži planer smena, potrebe za ljudima i dostupnost, bez odvojenog modela rezervacija. Ne menjati terminologiju smena u rezervacije.

Generisane slike u razgovoru su vizuelna referenca. Tekst, funkcije i semantička pravila iz ovog dokumenta imaju prednost nad artefaktima slika. Senčenja, gradijenti, pogrešni razmeri ili ikonice koje je generator uneo nisu implementacioni zahtev.

## 1. Vizuelni pravac i ono što se čuva

- Tamna tema je podrazumevana: neutralan, blago topao grafit; lavanda označava glavnu akciju, prigušena plava izbor i navigaciju.
- Svetla tema: topla gotovo bela pozadina, bele površine, tamnija ljubičasta glavna akcija i isti smisao plavog akcenta.
- Ravne površine bez dekorativnih gradijenata, glassmorphism efekata i jakih senki. Odvajanje postižu ton, razmak i border.
- Čuvaju se četiri glavna odredišta, izbor nedelje, mobilni izbor dana, desktop nedelja i osnovni tokovi dodavanja, zamene, zamene mesta, zaključavanja, čuvanja i objavljivanja.
- Manja gustina komandi postiže se grupisanjem i otkrivanjem detalja; ne sitnim tekstom ili malim dodirnim zonama.

## 2. Semantičke boje

Vrednosti su konačna polazna specifikacija, ne uzorci iz raster slike. Mapirati ih na postojeće shadcn promenljive i jednu zajedničku definiciju tema. Ne dodavati HEX vrednosti pojedinačnim ekranima.

| Token / uloga | Tamna tema | Svetla tema |
| --- | --- | --- |
| `background` / pozadina stranice | `#19191D` | `#F5F3F0` |
| `surface` / paneli, polja | `#242429` | `#FFFFFF` |
| `surface-raised` / otvorene opcije, hover sekundarnog | `#2B2A31` | `#EFECF4` |
| `foreground` / osnovni tekst | `#F4F1EC` | `#26232C` |
| `muted-foreground` / pomoćni tekst i placeholder | `#BCB7C5` | `#625B6C` |
| `border` / dekorativni razdelnik, panel | `#49474F` | `#D4D0DA` |
| `input` / granica polja i kontrola | `#81798B` | `#81788C` |
| `primary` / glavna akcija | `#B6A4F5` | `#7050B8` |
| `primary-hover` | `#C5B6FA` | `#60409F` |
| `primary-pressed` | `#A38CE7` | `#53358C` |
| `primary-foreground` | `#21182F` | `#FFFFFF` |
| `selection` / izabrani dan, checkbox | `#91B8D5` | `#DCEAF4` |
| `selection-foreground` | `#142B3C` | `#285477` |
| `selection-subtle` / aktivno odredište, tab | `#28333D` | `#DCEAF4` |
| `selection-subtle-foreground` / navigacija i linkovi | `#A8CFE8` | `#285477` |
| `ring` / fokus | `#C8B7FF` | `#6043A0` |
| `success` / uspeh | `#9BD4B1` | `#24683D` |
| `success-surface` | `#21372A` | `#E9F4EC` |
| `warning` / pažnja, dozvoljena izmena uz upozorenje | `#F0C36D` | `#7A4E00` |
| `warning-surface` | `#352B1B` | `#FFF3D8` |
| `destructive` / greška, destruktivna radnja | `#FFAAA4` | `#A52F35` |
| `destructive-surface` | `#3C2527` | `#FCEDEC` |
| `disabled-foreground` | `#ABA6B3` | `#655F6D` |
| `disabled-surface` | `#302D35` | `#E8E4EC` |

`card` i `popover` koriste `surface`; `secondary` i `muted` koriste odgovarajući neutralni nivo. Navigacioni/sidebar tokeni moraju koristiti iste semantičke uloge. Statički dekorativni border nije dovoljan za prepoznavanje granice polja: za polja koristiti `input`. Izbor ima i znak, podvlačenje ili jasnu konturu; naročito svetloplava selekcija u svetloj temi ne sme zavisiti samo od boje ispune.

### Računska provera kontrasta

Provereno je 36 definisanih parova sRGB boja formulom relativne luminanse. Svi zadovoljavaju cilj za svoju ulogu. Brojevi su za prikaz zaokruženi na dve decimale; prolaz je proveren pre zaokruživanja.

| Par | Tamna | Svetla |
| --- | ---: | ---: |
| Osnovni tekst / površina | 13,71:1 | 15,45:1 |
| Pomoćni tekst / površina | 7,88:1 | 6,50:1 |
| Pomoćni tekst / izdignuta površina | 7,25:1 | 5,56:1 |
| Tekst primarnog dugmeta / default | 7,78:1 | 5,95:1 |
| Tekst primarnog dugmeta / hover | 9,26:1 | 7,69:1 |
| Tekst primarnog dugmeta / pressed | 6,04:1 | 9,31:1 |
| Izabrani dan: tekst / ispuna | 6,96:1 | 6,52:1 |
| Izabrana navigacija: tekst / ispuna | 7,82:1 | 6,52:1 |
| Uspeh: tekst / semantička površina | 7,57:1 | 5,96:1 |
| Upozorenje: tekst / semantička površina | 8,42:1 | 6,53:1 |
| Greška: tekst / semantička površina | 7,76:1 | 6,04:1 |
| Disabled: tekst / ispuna | 5,69:1 | 4,91:1 |
| Granica polja / izdignuta površina | 3,41:1 | 3,60:1 |
| Fokus / izdignuta površina | 7,90:1 | 6,40:1 |
| Link / površina | 9,38:1 | 8,00:1 |

Ovo nije potvrda pristupačnosti cele aplikacije: implementacija mora proveriti stvarne kombinacije, native kontrole, fokus, povećanje teksta i stanja. Cilj je najmanje 4,5:1 za običan tekst i 3:1 za potrebne netekstualne indikatore. Dodirne zone od 44 × 44 CSS px su naš proizvodni cilj; WCAG 2.2 AA minimum 24 × 24 nije ovde izabrana veličina kontrola.

Izvori: [W3C — kontrast teksta](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [kontrast kontrola](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [veličina cilja](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## 3. Tipografija, razmaci i geometrija

Zadržati već instalirani Public Sans kao jedini UI font. Ne preuzimati novi font. Koristiti uobičajene težine 400, 500, 600 i 700; bez oslanjanja na ekstremno podebljanje. Vremena, sati i brojke koriste tabularne cifre.

| Uloga | Veličina / prored | Težina |
| --- | --- | --- |
| Naslov ekrana | mobilno 24/30 px; desktop 28/34 px | 700 |
| Naslov sekcije / dana | 18/24 px | 600–700 |
| Ime zaposlenog, vreme smene | 16/22 px | 600 |
| Osnovni tekst, dugmad, input | 16/24 px | 400 / 600 za akcije |
| Labela i pomoćni tekst | 14/20 px | 500 / 400 |
| Breadcrumb, sekundarni metadata | 12/16 px | 500; bez preteranog razmaka slova |
| Donja navigacija | 12/16 px; ikona 20 px | 500, aktivno 600 |

- Skala razmaka: 4, 8, 12, 16, 24, 32 px. Mobilne margine 16 px; između glavnih sekcija 24 px; unutar redova 8–12 px; padding kartice 12–16 px.
- Kontrole najmanje 44 px visine; primarne mobilne akcije 48 px. Ikonska dugmad 44 × 44 px. Checkbox može biti vizuelno 20 px, ali cela labela ima najmanje 44 px dodirne visine.
- Radijusi: kontrole 10 px, kartice 14 px, otvoreni panel/sheet 16 px. Avatar može ostati krug. Ne pretvarati sve u pilule.
- Border 1 px; fokus 3 px sa 2 px razmaka i jasno kontrastnom podlogom razmaka. Bez podrazumevane senke na svakoj kartici.
- Ikone iz postojećeg Phosphor skupa, ista težina i optička veličina; bez mešanja Unicode simbola za iste akcije.
- Kratke promene stanja 120–160 ms; poštovati `prefers-reduced-motion`. Bez animiranog preslaganja liste.

## 4. Globalne promene i zajedničke komponente

Polazne tačke: [globals.css](../src/app/globals.css), [postojeći Button](../src/components/ui/button.tsx), [shell](../src/components/workspace-app.tsx), [ThemeToggle](../src/components/theme-toggle.tsx).

1. Objediniti sadašnje ponovljene `:root`, `.dark` i hardkodovane boje u jedan token sistem za obe teme. Ukloniti zamenjena pravila, ne nadograđivati kraj CSS-a novim izuzecima.
2. Unaprediti postojeći shadcn/Base UI Button i koristiti ga na ekranima. Sadašnje male podrazumevane veličine ne zadovoljavaju dogovoreni cilj 44 px. Ne praviti konkurentski drugi Button sistem.
3. Deliti obrasce za polja, poruke, zaglavlja sekcija, izbor dana/taba i sklopive liste. Izdvojiti koherentne komponente prema odgovornosti; izbeći jedan veliki ekran i nepotrebne apstrakcije.
4. Sačuvati podrazumevani dark i postojeći zapamćeni izbor bez svetlog bljeska pri učitavanju. Ista pravila primeniti na prijavu, kreiranje prostora i timski kalendar.
5. Aktivna navigacija dobija boju + tekstualno/oblikovno stanje i `aria-current`; ukloniti pogrešnu nadoznaku „ODSUSTVA” sa Tima i Podešavanja.

### Stanja komponenti

| Komponenta | Obavezna stanja i ponašanje |
| --- | --- |
| Dugme | default, hover za miš, pressed, focus-visible, disabled, busy sa tekstom. Pending sprečava dupli zahtev; labela i širina ostaju stabilne. Razlog nedostupne važne akcije vidljiv uz kontrolu, ne samo u hover tooltip-u. |
| Polje/select | labela, vrednost, placeholder, fokus, greška sa tekstom i `aria-describedby`, disabled, read-only. Input 16 px; vreme 24-časovno gde browser to dozvoljava; obavezne vrednosti i lokalni native formati ne smeju zbunjivati. |
| Tab | izabran i neizabran, podvlačenje/indikator + boja; semantički tablist, tastatura i veze sa panelom. Prebacivanje čuva unete vrednosti. |
| Opcije smene | zatvoreno/otvoreno, zamena zaposlenog, zamena mesta, zaključano, pending, bez rezultata. Enter/Space otvara, Escape zatvara, fokus se vraća na pokretač. Nema hover-only akcija. |
| Poruka | uspešno sačuvano, sačuvano uz upozorenja, čuvanje, neuspeh i pokušaj ponovo. Boja + ikona + konkretan tekst. `role=status` za neblokirajuću povratnu informaciju, `role=alert` za neuspeh koji zahteva pažnju. |
| Prazno/učitavanje | stabilno mesto i jasna poruka; postojeće prečice za dopunu tima/potreba. Razlikovati „nema smena”, „filter nema rezultate” i neuspešno učitavanje. |
| Lista | skupljena, proširena, prazna, pretraga bez rezultata, dodavanje/brisanje pending, greška. Fokus i proširenost se ne resetuju na uspešan refresh. |

## 5. Raspored

Polazna tačka: [schedule-panel.tsx](../src/components/schedule-panel.tsx).

- Redosled: naslov → nedelja → filter i „Još” → Generiši / Objavi ažuriranje → jedan sažetak → stanje čuvanja/upozorenja → dani → smene → Link za tim.
- „Još” sadrži postojeću akciju Štampaj/PDF. Deljenje ostaje u jasno vidljivoj sekciji „Link za tim”; ne duplirati ga u dva menija.
- Jedan sažetak: pokrivenost, dodeljeni sati i objavljena revizija. Čuvanje nacrta nije objavljivanje. Posle izmene jasno označiti da tim još vidi prethodnu objavu.
- Kartica smene prikazuje vreme, ulogu, ime ili „Nepokriveno”, stanje zaključavanja/upozorenja i „Opcije”. Vreme preko ponoći uključuje jasan indikator narednog dana.
- Opcije grupišu postojeće Zameni, Zameni mesta, Zaključaj/Otključaj i Ukloni smenu. Zamena/zamena mesta čuva definicije datuma i vremena; swap je i dalje jedna atomska operacija. Postojeće vraćanje uklonjene smene ostaje dostupno.
- Generator zadržava napredak i otkazivanje. Potpuno, nepotpuno i limit pretrage imaju različite poruke. Nijedno upozorenje ili oznaka 2/2 ne sme tvrditi da su sva pravila zadovoljena.
- Pri nedovoljnoj pokrivenosti jasno objasniti nedostupnu objavu. Ne uvoditi dodatni blok objavljivanja samo zbog ručnih upozorenja, jer je dogovor da ručni override ostaje dozvoljen.
- Statičko objašnjenje ručnih izmena može biti kratko; kada postoje konkretna upozorenja, ona imaju prednost i ne ponavljaju generički veliki panel.

## 6. Ručne izmene — konkretna upozorenja

Ovo je dodatna povratna informacija, ne pooštravanje ručnih zabrana. Postojeće granice vlasništva, reference, revizije, zaključavanja i integritet podataka ostaju obavezni. Automatsko generisanje i dalje mora da poštuje postojeća pravila.

### Detekcija i sadržaj

- Čista domenska funkcija uz postojeći [scheduling modul](../src/lib/scheduling/engine.ts); nema React-a ni poziva baze u detekciji. Deliti intervalsku/timezone logiku sa postojećim proverama da ne nastanu dve različite definicije odsustva, odmora i sati.
- Prikupiti sve relevantne razloge, ne stati na prvom kao sadašnji `violation`. Postojeći generator ne menjati tako da postane blaži; upozorenja su odvojen rezultat.
- Posebna savetodavna provera: isti zaposleni ima dve ili više smena u istom lokalnom danu, čak i ako se ne preklapaju i sati su dozvoljeni. To nije nova tvrda zabrana.
- Za noćne smene koristiti stvarni interval u zoni prostora: upozorenje za deljeni kalendarski dan kada oba intervala imaju trajanje tog dana. Kraj u 00:00 ne dodaje rad narednog dana. Jedna noćna smena sama nije dupla smena.
- Odsustvo za ceo dan i delimično odsustvo odvojiti od nedostajuće nedeljne dostupnosti: „Cal ima uneto odsustvo 9. novembra” naspram „Cal nije dostupan u ovom terminu”. Ne prikazivati privatnu napomenu.
- Obuhvatiti preklapanje, odmor, dnevni/nedeljni maksimum i neaktivnog zaposlenog prema postojećim pravilima. Ne uvoditi nova ograničenja uloga ili nove poslovne uslove.
- Ignorisati otkazane i nedodeljene smene. Uključiti relevantne susedne nedelje. Deduplicirati razloge po osobi, danu/paru smena i vrsti; dve pogođene kartice ne znače dva ista razloga u sažetku.
- Pri zameni mesta proveriti obe strane i sve pogođene dodele; pri ponovnom učitavanju ponovo izračunati oznake iz aktuelnog rasporeda, dostupnosti i pravila.

### Povratna informacija

1. Tokom lokalne/pending izmene oznake mogu već biti vidljive, ali poruka kaže „Čuvanje…”. Tek potvrđen server save sme reći „Sačuvano uz upozorenja”.
2. Kratka neblokirajuća poruka prikazuje jedan ili dva razloga i Poništi izmenu. Ako razloga ima više: „Prikaži sva upozorenja (N)”. Ne praviti zid teksta niti obavezni modal.
3. Svaka pogođena smena zadržava ikonu i „Proveriti”; detalji se otvaraju na dodir/tastaturu. Oznaka traje dok uzrok postoji, čak i nakon zatvaranja kratke poruke ili reload-a.
4. Sažetak upozorenja odnosi se na celu nedelju, čak i kada filter/dan trenutno skrivaju pogođenu smenu; ponuditi odlazak na nju. Upozorenja ne skupljati pravilom „najviše tri stavke”.
5. Kod neuspeha čuvanja prikazati grešku i postojeći retry/server-reload tok, a ne zelenu potvrdu. Undo poštuje red čuvanja i revizije, ne poništava tuđu izmenu.
6. Upozorenja i odsustva pripadaju menadžerskom prikazu. Ne dodavati ih u javni timski odgovor, objavljeni snapshot ili privatne podatke na štampi.

## 7. Timski link

Dogovor: jedno dugme **„Napravi link za tim”**; svaki svesni klik pravi novi link i automatski zamenjuje prethodni. Ukloniti posebne „Zameni postojeći link” i „Rotiraj link”. Sačuvati Kopiraj i Opozovi link.

- Pre dugmeta kratko objašnjenje: „Pravljenje novog linka poništava prethodni.” Nema dodatnog obaveznog confirmation dijaloga za ovu dogovorenu akciju.
- Posle potvrđenog uspeha prikazati novi URL, „Kopiraj” i „Novi link je spreman. Prethodni više ne važi.” Sam nastanak novog linka ne kopira automatski u clipboard.
- Pending ima stabilnu labelu „Pravljenje…” i sprečava dvoklik. Retry iste operacije ponovo šalje isti kandidat tokena; ne rotirati još jednom zbog tehničkog retry-a.
- Na neuspeh ne zameniti lokalno prikazan aktivni token novim nepotvrđenim. Ako je odgovor izgubljen i ishod nepoznat, ne tvrditi da prethodni link radi: prikazati „Status linka nije potvrđen. Pokušajte ponovo” i potvrditi istim kandidatom.
- Clipboard uspeh/neuspeh imaju poruku. Pri neuspehu omogućiti ručno kopiranje iz read-only polja.
- Obično čuvanje, menjanje nedelje i objavljivanje nikada ne menjaju link. Postojeći timski URL i objavljeni sadržaj ostaju isti sve do eksplicitnog pravljenja novog ili opoziva.
- Postojeći SQL `rotate_team_link` radi insert ili update u jednoj operaciji i podržava i prvi link. Plan je da jedino dugme koristi tu postojeću RPC funkciju. Pre implementacije proveriti stvarnu verziju funkcije i ovlašćenja u nameravanom projektu; ne polaziti od zahteva za migracijom. Pogledati [postojeću migraciju](../supabase/migrations/20261110084343_phase2_scheduling.sql).
- Autorizacija vlasnika, tenant granice, hash tokena i ograničeni javni odgovor ostaju isti. Testove invalidacije raditi samo u izolovanim fixture-ima/PGlite, ne na stvarnom aktivnom linku.

## 8. Dostupnost

Polazna tačka: [availability-panel.tsx](../src/components/availability-panel.tsx).

- Dva taba: **Nedeljno** i **Odsustva i izuzeci**, isto nazvana na mobilnom i desktopu. Odvajaju postojeće funkcije, ne dodaju novu.
- Izabrani zaposleni jasno je vidljiv iznad editora. Otvaranjem izbora dostupna je postojeća pretraga i lista; početno najviše tri imena. Aktivno ime ostaje vidljivo i kada se lista skupi ili pretraga promeni.
- Dani imaju pune nazive i checkbox; raspoređuju se u više redova koliko treba. Ne forsirati sedam dugih naziva u jedan red.
- Od/Do mogu biti u dve kolone ako staju na 320 px uz čitljiv tekst i kontrole; u suprotnom jedna kolona. Sačuvati Do kraja dana (24:00), više dana po unosu i pomoć za noćne smene.
- Pomoć za noćnu smenu otvara postojeće objašnjenje, ne menja način čuvanja intervala.
- „Uneta dostupnost” je sažeta tabela/lista sa brojem termina i čitljivim danom/vremenom. Ostaviti sve termine potrebne za poređenje; ne primenjivati automatski pravilo tri stavke.
- Izuzeci čuvaju osobu, datum, ceo/deo dana i privatnu napomenu. Pokazati validacionu poruku za pogrešno vreme umesto tihog odustajanja od submit-a.
- Prebacivanje taba čuva lokalno uneta polja i izbor osobe; ne šalje podatke. Prazna stanja i poruke čuvanja pripadaju aktivnom zadatku.
- Ruta [radni-raspored](../src/app/radni-raspored/page.tsx) ostaje jednostavan prikaz: Raspored i Odsustva i izuzeci. Ne otkrivati u njemu Nedeljno, Tim ili Podešavanja.

## 9. Potrebni ljudi i duge liste

Polazna tačka: [settings-panel.tsx](../src/components/settings-panel.tsx).

- Naslov „Potrebni ljudi · N ukupno”; dodatni tekst „Prikazano 3 od 8” kada ima skrivenih stavki. Broj označava stavke/potrebe, ne zbir potrebnih radnika.
- Početno najviše tri potrebe. Kada ih ima osam: **Prikaži još 5** otvara preostalih pet; prošireno stanje ima **Prikaži manje**. Ako je N ≤ 3, nema kontrole. Kontrola koristi `aria-expanded` i `aria-controls`.
- Stabilan redosled prema danu/datumu, početku smene, ulozi i stabilnom ID-u za izjednačenja; ne zavisiti od proizvoljnog redosleda odgovora baze. Koristiti postojeća polja, bez dodavanja kolone u bazi.
- Dodavanje ne otvara automatski listu i ne skroluje stranicu. Skupljena lista ostaje najviše tri stavke; broj se ažurira, a status kaže „Potreba je dodata”. Ako nova stavka ostaje skrivena, ponuditi „Prikaži dodatu stavku”; tek taj svesni klik širi i vodi do nje.
- Proširena lista ostaje proširena posle dodavanja/brisanja/refresh-a. Ne remetiti postojeći unos forme.
- Pri brisanju vidljivog reda zadržati njegov prostor tokom zahteva, pa po uspehu popuniti do tri sledećom stavkom. Kod greške zadržati red i fokus. Fokus posle uspeha vodi na sledeću odgovarajuću radnju ili kontrolu liste.
- Ručno skupljanje vraća fokus na kontrolu i čuva vidljiv položaj zaglavlja liste koliko je potrebno; bez iznenadnog skoka na vrh stranice i bez prazne fiksne visine cele liste.
- Sličan obrazac: izbor zaposlenog u Dostupnosti dobija jasnu kontrolu Prikaži manje; Tim zadržava pretragu i početnih deset, uz tačan broj naredne grupe od najviše 25. Dugme ne sme tvrditi „još 290” ako dodaje samo 25.
- Raspored, sva upozorenja i uporedni termini dostupnosti nisu liste koje se automatski skraćuju na tri. Liste izuzetaka za sada ostaju vidljive; ne dodavati skrivanje bez konkretne potrebe.

## 10. Ostali ekrani i responsive pravila

### Globalni prenos stila

Tim, Podešavanja, prijava, kreiranje prostora i timski kalendar dobijaju iste tokene, tipografiju, kontrole i stanja. Njihov funkcionalni raspored se ne preuređuje osim navedenog sažimanja potreba i ispravke nadnaslova. Zadržati email/telefon + lozinku i postojeći izbor teme, bez OTP-a, novih potvrda i novih provider-a.

### Mobilno i desktop

- Oko sadašnjeg praga 650 px zadržati prelaz između donje navigacije/dnevnog prikaza i sidebar-a/nedelje; ne menjati breakpointe samo radi drugačijeg izgleda.
- Mobilno: 16 px bočne margine, donja navigacija sa safe-area prostorom i dovoljnim paddingom sadržaja. Sadržaj i fokus ne smeju ostati iza fiksne navigacije ili tastature.
- Sedam dnevnih ciljeva od najmanje 44 px: na 390 px mogu stati; na užim širinama dani smeju lokalno horizontalno da se skroluju. Stranica ne sme dobiti horizontalni overflow. Fokus i izabrani dan ostaju vidljivi.
- Desktop: postojeća nedelja ostaje glavni radni prostor, sa kompaktnim karticama. Ako sedam kolona ne staje, dozvoljen je jasno ograničen skrol kalendara; ne smanjivati vreme i kontrole na 11 px.
- „Opcije” na telefonu mogu otvoriti postojeći Base UI dijalog/sheet sa vidljivim naslovom, zatvaranjem i fokus menadžmentom; desktop može koristiti popover. Koristiti isti sadržaj i domenske akcije. Na skučenom prostoru radnje se prelamaju, ne seku.
- Provera na 320, 390, 768 i 1440 px, pri 200% uvećanju teksta, u obe teme. Desktop raspored ne mora da kopira mobilnu ilustraciju piksel po piksel.
- Štampa ostaje bela i čitljiva, sa svih sedam dana, bez navigacije, menadžerskih komandi, odsustava i privatnih poruka.

## 11. Redosled budućeg rada

| Korak | Zavisnost | Očekivani efekat | Približan obim |
| --- | --- | --- | --- |
| 1. Snimiti polazno stanje i izolovane fixture-e za prihvaćene ekrane | Pregled trenutnog diff-a i važećih uputstava | Jasno poređenje bez diranja stvarnih podataka | Mali |
| 2. Tokeni, tipografija, zajednički Button/polja/poruke i CSS konsolidacija | 1 | Doslednost obe teme u celoj aplikaciji | Veći |
| 3. Shell, navigacija i prioritetni Raspored/Opcije | 2 | Raspored ranije vidljiv, manje stalnih komandi | Srednji do veći |
| 4. Detekcija i UI upozorenja | 3; deljena domenska intervalska logika | Bez slučajnih neprimećenih override-a | Srednji do veći |
| 5. Jedno dugme za timski link | 2; potvrđena postojeća RPC semantika | Jednostavno pravljenje/zamena linka | Mali do srednji |
| 6. Dostupnost sa dva taba i izborom osobe | 2 | Kraći tok i jasna razlika nedeljno/izuzeci | Srednji |
| 7. Potrebni ljudi i precizne kontrole dužih lista | 2 | Kraća podešavanja bez gubitka pregleda | Mali do srednji |
| 8. Prenos zajedničkog stila na ostale ekrane, Chrome i regresiona provera | 3–7 | Konzistentan i proveren rezultat | Srednji |

Ovo su relativni obimi, ne obećanje vremenskog roka. Vizuelne promene su većinom frontend; upozorenja zahtevaju domensku logiku i testove; link zahteva proveru postojećeg RPC-a. Ne predviđa se nova zavisnost ili migracija. Ako je stvarno neophodna, prvo objasniti konkretan razlog i primeniti granice korisničkog odobrenja.

## 12. Kriterijumi prihvatanja buduće implementacije

### Vizuelno i pristupačnost

- [ ] Obe teme koriste jedinstvene tokene; nema preostalih plavih hardkodovanih izuzetaka i drugog Button sistema za iste uloge.
- [ ] Čitljiv tekst, dogovorene dodirne zone, vidljiv fokus i nekolorni indikatori. Proveriti stvarni computed stil, ne samo ovaj proračun palete.
- [ ] Chrome na 320/390/768/1440 px, dark/light; nema page overflow-a, sečenih menija, pokrivenog fokusa ili obaveznog hover-a.
- [ ] Tastatura: navigacija, dani, tabovi, Opcije, zamena/swap, zatvaranje, povratak fokusa, liste i greške. Reduced motion i uvećanje teksta provereni.
- [ ] Ekrani prazno/učitavanje/generisanje/nepotpuno/limit/sačuvano/greška/zaključano provereni odgovarajućim fixture-ima.
- [ ] Print preview ili reprezentativan PDF u Chrome-u: svih sedam dana, bez privatnih upozorenja i komandi.

### Ponašanje

- [ ] Zamena čuva datum/vreme; swap proverava obe strane i čuva atomski; queue/retry/undo i revizije rade kao pre.
- [ ] Čist fixture nema upozorenja; dve nepreklapajuće smene iste osobe u danu daju savetodavno upozorenje; preklapanje i odmor ostaju odvojeni razlozi.
- [ ] Ceo dan odsustva, deo dana, odsustvo bez preklapanja, nedeljna nedostupnost, ponoć/DST i susedna nedelja imaju odgovarajuće rezultate; otkazana/nedodeljena smena ne daje lažnu duplu dodelu.
- [ ] Više razloga se prikaže zajedno bez dupliranja; filter i reload ih ne gube; swap/undo ponovo računaju sve pogođene smene.
- [ ] Save greška ne prikazuje uspeh. Ručno upozorenje ne blokira dozvoljeni override/objavu. Generator i dalje ne krši postojeća pravila i razlikuje nepotpunost od limita.
- [ ] Link: prvi klik radi; sledeći zamenjuje; stari prestaje da vraća raspored, novi vraća isti objavljeni sadržaj. Objava nove nedelje ne menja token.
- [ ] Link testovi pokrivaju drugi browser bez lokalno zapamćenog linka, dvoklik, retry istim tokenom, izgubljen odgovor, opoziv, copy neuspeh i tuđi/anonimni poziv. Sve u izolovanom okruženju.
- [ ] Potrebni ljudi: N=0/1/3/8, dugmad sa tačnim brojem, Prikaži manje, dodavanje i uklanjanje u oba stanja, stabilan fokus i broj stavki.
- [ ] Dostupnost čuva unos pri promeni taba; jednostavna ruta i dalje nudi samo svoje postojeće funkcije.
- [ ] Timski link ne otkriva nacrte, kontakte, ciljne sate, razloge odsustva ili upozorenja.

### Tehnička provera i izveštaj

- [ ] Pokrenuti postojeći lint, typecheck, build, scheduling i schema/PGlite provere, kao i Chrome testove relevantnih tokova. Dodati smislene domenske testove upozorenja i izolovane regresione testove linka/liste; bez snapshot testova koji samo preslikavaju CSS.
- [ ] Koristiti instalirano okruženje. Ako `pnpm` nije na PATH-u, proveriti postojeći Corepack/lokalne binarne fajlove; ne instalirati naslepo i ne menjati lockfile radi ove vizuelne izmene.
- [ ] Ne menjati Auth podešavanja, RLS, šemu, cenovnik, algoritam prioritizacije ili publikovati Git/deployment u okviru ove implementacije bez odgovarajuće posebne autorizacije.
- [ ] Odvojeno navesti šta je provereno u fixture-ima/PGlite, šta u browseru, a šta stvarno na hostovanom sistemu. Nijedna ranija ili generisana slika nije dokaz novog prolaza.

## Isporuka ove faze

Samo ovaj plan i [neizvršeni implementacioni prompt](./UI_UX_IMPLEMENTATION_PROMPT.md). U ovoj fazi nisu menjani aplikacioni kod, konfiguracija, zavisnosti, API ili baza; nisu pokrenute migracije, registracije, Git objava ili deployment. Paleta je računski proverena, a vizuelni i funkcionalni kriterijumi iznad tek treba da budu provereni posle buduće implementacije.

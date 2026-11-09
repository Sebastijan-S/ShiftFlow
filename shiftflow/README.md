# ShiftFlow

Radna osnova za planiranje smena u kafićima, u Next.js i TypeScript okruženju. Tačan shadcn preset `b7kBsBkh7b` primenjen je zvaničnim CLI-jem: Nova, Zinc, Green, Remix Icon, Instrument Sans i Geist Mono. Fontovi se isporučuju lokalno.

## Pokretanje

Node.js 22+ i pnpm. Verzije zavisnosti su zaključane u `pnpm-lock.yaml`.

```sh
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
```

Dev server: `http://127.0.0.1:3000`. Produkcioni statički izlaz je `out/`; Supabase je zaseban backend. `scripts/next.mjs` normalizuje preusmerene Windows putanje pre pokretanja Next.js-a. Koristi se Webpack zbog problema Turbopack-a sa takvim putanjama.

## Dostupno

- Izolovani demo kafić sa 10 zaposlenih, 42 nedeljne smene i 336 planiranih sati.
- Determinističko generisanje uz dostupnost, pozicije, odmor, noćne smene, ograničenje sati, preferencije i raspodelu vikenda. Pretraga koristi 36 ponovljivih prolaza; nije garantovan matematički optimalan raspored.
- Zaključavanje smena, ručna izmena, prevlačenje, kopiranje u praznu sledeću nedelju, interne napomene, pretraga i filter pozicije.
- Nedeljna tabela, dnevni prikaz i lista; zapamćeni izbor prikaza i teme.
- Evidencija zaposlenih, nedeljna dostupnost, fond sati, vremena smena, potrebni ljudi po danu i podešavanje upozorenja/zabrana.
- Lokalno automatsko čuvanje sa prijavom greške; Undo/Redo istorija ostaje posle osvežavanja. Najviše 100 koraka u klijentskoj istoriji.
- Pregled sati i današnjih smena, lokalni status objavljivanja, PNG izvoz i štampa u PDF.
- Supabase adapter za prijavu/registraciju, atomsku sinhronizaciju, istoriju i privatne linkove, aktivan kada se unese konfiguracija.
- Tamna i svetla tema, srpska latinica, 24-časovno vreme, Europe/Belgrade.

Demo koristi `shiftflow:demo:v1` u localStorage. Poslovni prostori imaju odvojene ključeve po company ID-ju; demo podaci se ne unose u novoregistrovanu firmu. Nema lažne prijave ni linkova koji tvrde da rade bez baze.

## Povezivanje Supabase projekta

1. Napraviti Supabase projekat i primeniti `supabase/migrations/202611030001_shiftflow.sql` kroz SQL editor ili Supabase CLI.
2. Kopirati `.env.example` u `.env.local` i uneti URL i javni publishable/anon ključ. Nikada ne unositi service-role ključ u `NEXT_PUBLIC_*` promenljive.
3. U Supabase Auth podesiti Site URL i dozvoljene redirect adrese za lokalni i objavljeni domen; potvrda emaila se poštuje.
4. Ponovo pokrenuti dev server ili produkcioni build. Statički export ugrađuje javne promenljive u trenutku builda.
5. Registracija kreira praznu firmu i vlasnika. Dodati zaposlene, podesiti smene/potrebe, generisati i objaviti raspored.

Migracija kreira firme, članstva, zaposlene, pozicije, dostupnost, smene, potrebe, nedelje, dodele, odsustva, zamene, istoriju, privatne linkove i obaveštenja. Svi podaci pripadaju firmi; složeni strani ključevi sprečavaju spajanje redova iz različitih firmi. Direktne izmene tabela sa javnim ključem su zabranjene. `save_workspace` proverava članstvo i verziju, čuva dokument, normalizovane podatke i audit u jednoj transakciji. Vlasnik menja pravila i naziv firme; menadžer raspoređuje tim. Objavljene nedelje se dodatno validiraju u PostgreSQL-u.

Verzionisanje trenutno koristi optimistic concurrency: zastarela verzija se odbija umesto da prepiše noviju promenu. Klijent javlja konflikt; posle ponovnog učitavanja uzima se poslednja sačuvana serverska verzija. Prethodni lokalni dokument se arhivira pod `shiftflow:company:<id>:v1:recovery`. Serverski audit je trajan; interfejs za rešavanje konflikata i automatsko osvežavanje između menadžera još nisu implementirani.

Privatni link koristi 244 bita slučajnosti, u bazi se čuva SHA-256 hash, važi 60 dana i može se zameniti/opozvati. Javni RPC vraća samo objavljenu nedelju, imena, pozicije i termine; interne napomene, fond sati i dostupnost se ne vraćaju. Site hosting je u početku privatan vlasniku; pristup zaposlenih preko linka zahteva i odgovarajuće podešen pristup hostingu.

## Provere

`pnpm test` izvršava sedam testova generatora/istorije i integracioni test migracije u privremenom PostgreSQL-u (PGlite). Integracioni test proverava dve firme, RLS, uloge, atomsko čuvanje, zastarele verzije, nevalidno objavljivanje, privatnost podataka i opoziv linka. Supabase Auth se u tom testu simulira; pravi email tok i mrežna sinhronizacija traže stvarni projekat.

## Preostalo iz trofaznog plana

Ovo je početni funkcionalni MVP. Produkciona Supabase baza nije kreirana niti povezana bez konfiguracije korisnika. Za kompletan pilot ostaju: vođeni onboarding, UI za pozivanje/uklanjanje menadžera, prilagođene pozicije i dodatne smene, datumska odsustva i evidencija zamena u interfejsu, cascading meniji, dupliranje pojedinačne smene i grupne izmene, puni prikaz serverskih obaveštenja, automatska sinhronizacija više menadžera, napredni oporavak konflikata i pilot provera u kafićima. Tabele odsustava/zamena i osnovni pristupni RPC-ji su pripremljeni; još nisu deo glavnog korisničkog toka.

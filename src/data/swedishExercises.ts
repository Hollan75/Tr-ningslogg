import type { Exercise } from '../types';

// Curated Swedish exercise library – functional strength with extra focus on
// shoulder stability (rotator cuff/scapula), knees and glutes/hip stability.
// Bump SWEDISH_LIBRARY_VERSION when entries change so installed apps re-sync.
export const SWEDISH_LIBRARY_VERSION = '2';

type Level = 'Nybörjare' | 'Medel' | 'Avancerad';

// [id, namn, muskelgrupp, primära, sekundära, utrustning, kategori, nivå, instruktioner]
type Raw = [string, string, string, string[], string[], string, string, Level, string[]];

const RAW: Raw[] = [
  // ─── BEN ──────────────────────────────────────────────────────────────────
  ['se_goblet_knaboj', 'Goblet-knäböj', 'Ben', ['framsida lår', 'säte'], ['bål', 'insida lår'], 'Kettlebell', 'Styrka', 'Nybörjare', [
    'Håll kettlebell eller hantel mot bröstet, fötterna strax bredare än höfterna',
    'Sätt dig ner mellan hälarna med rak rygg och knäna i linje med tårna',
    'Gå så djupt du kan med bibehållen kontroll',
    'Pressa upp genom hela foten och spänn sätet i toppen',
  ]],
  ['se_knaboj_skivstang', 'Knäböj med skivstång', 'Ben', ['framsida lår', 'säte'], ['baksida lår', 'ländrygg', 'bål'], 'Skivstång', 'Styrka', 'Medel', [
    'Stången på övre ryggen, fötterna axelbrett och tårna lätt utåt',
    'Andas in, spänn magen och böj i höft och knä samtidigt',
    'Knäna följer tårnas riktning – låt dem inte falla inåt',
    'Res dig med bröstet uppe och pressa golvet ifrån dig',
  ]],
  ['se_box_knaboj', 'Boxknäböj till bänk', 'Ben', ['framsida lår', 'säte'], ['baksida lår', 'bål'], 'Bänk', 'Styrka', 'Nybörjare', [
    'Ställ dig framför en bänk eller låda i lagom höjd',
    'Skjut höften bakåt och sätt dig mjukt – inte tungt – på bänken',
    'Behåll spänningen i bålen utan att slappna av',
    'Res dig genom att pressa genom hälarna. Knävänlig variant',
  ]],
  ['se_bulgarisk_utfall', 'Bulgarisk utfallsböj', 'Ben', ['framsida lår', 'säte'], ['insida lår', 'bål'], 'Hantlar', 'Styrka', 'Medel', [
    'Bakre foten på en bänk, främre foten ett stort steg framför',
    'Sänk bakre knät rakt ner mot golvet med lätt framåtlutad överkropp',
    'Främre knät följer tårna, hälen kvar i golvet',
    'Pressa upp via främre foten. Mer framåtlutning = mer säte',
  ]],
  ['se_bakatutfall', 'Bakåtutfall', 'Ben', ['framsida lår', 'säte'], ['baksida lår', 'bål'], 'Hantlar', 'Styrka', 'Nybörjare', [
    'Stå höftbrett med hantlar i händerna',
    'Ta ett långt steg bakåt och sänk bakre knät mot golvet',
    'Håll främre smalbenet nästan lodrätt – skonsamt för knät',
    'Pressa tillbaka via främre hälen och byt ben',
  ]],
  ['se_step_up', 'Step-up på låda', 'Ben', ['framsida lår', 'säte'], ['vader', 'bål'], 'Låda', 'Styrka', 'Nybörjare', [
    'Hela foten på en låda i knähöjd eller lägre',
    'Luta dig lätt framåt och kliv upp med kraft från det övre benet',
    'Undvik att skjuta ifrån med det nedre benet',
    'Gå ner långsamt och kontrollerat',
  ]],
  ['se_spansk_knaboj', 'Spansk knäböj med band', 'Ben', ['framsida lår'], ['säte'], 'Gummiband', 'Rehab', 'Nybörjare', [
    'Fäst ett kraftigt band runt en stolpe och kliv in med banden bakom knäna',
    'Luta dig bakåt in i bandet med raka smalben',
    'Sitt ner till ca 90° i knät med upprätt överkropp',
    'Håll 30–45 s eller gör långsamma repetitioner. Bra för knäsmärta',
  ]],
  ['se_vaggsittning', 'Väggsittning', 'Ben', ['framsida lår'], ['säte'], 'Kroppsvikt', 'Rehab', 'Nybörjare', [
    'Ryggen mot väggen, gå ner tills knäna är i ca 60–90°',
    'Knäna över anklarna, vikten på hälarna',
    'Håll positionen och andas lugnt',
    'Statisk övning som ofta lindrar knäsmärta – välj en smärtfri vinkel',
  ]],
  ['se_tke', 'Terminal knästräckning med band', 'Ben', ['framsida lår'], [], 'Gummiband', 'Rehab', 'Nybörjare', [
    'Fäst bandet lågt och placera det bakom knät',
    'Börja med lätt böjt knä',
    'Sträck knät helt genom att spänna framsida lår, håll 2 s',
    'Släpp långsamt. Stärker inre lårmuskeln (VMO)',
  ]],
  ['se_benpress', 'Benpress', 'Ben', ['framsida lår', 'säte'], ['baksida lår'], 'Maskin', 'Styrka', 'Nybörjare', [
    'Fötterna axelbrett mitt på plattan',
    'Sänk tills höften precis börjar lyfta från sätet',
    'Knäna följer tårna, lås inte knäna i toppen',
    'Högre fotplacering = mer säte och mindre knäbelastning',
  ]],
  ['se_rdl', 'Rumänska marklyft', 'Ben', ['baksida lår', 'säte'], ['ländrygg', 'greppstyrka'], 'Skivstång', 'Styrka', 'Medel', [
    'Stå höftbrett med stången i händerna, lätt böjda knän',
    'Skjut höften bakåt och låt stången glida längs låren',
    'Rak rygg – gå ner tills du känner tydlig stretch i baksida lår',
    'Driv höften framåt och spänn sätet i toppen',
  ]],
  ['se_kb_marklyft', 'Kettlebell-marklyft', 'Ben', ['säte', 'baksida lår'], ['ländrygg', 'bål'], 'Kettlebell', 'Styrka', 'Nybörjare', [
    'Kettlebell mellan fötterna, fötterna höftbrett',
    'Fäll i höften, greppa med rak rygg och skuldrorna nere',
    'Res dig genom att trycka golvet ifrån dig',
    'Bra introduktion till höftfällning och marklyft',
  ]],
  ['se_trapbar_marklyft', 'Marklyft med trap bar', 'Ben', ['säte', 'framsida lår', 'baksida lår'], ['rygg', 'greppstyrka'], 'Trap bar', 'Styrka', 'Medel', [
    'Stå mitt i stången och greppa handtagen',
    'Höften lägre än axlarna, rak rygg och spänd bål',
    'Pressa golvet ifrån dig och res dig rakt upp',
    'Ryggvänligare än vanligt marklyft',
  ]],
  ['se_enbens_rdl', 'Enbens-marklyft med hantel', 'Säte', ['säte', 'baksida lår'], ['gluteus medius', 'bål', 'fotled'], 'Hantlar', 'Styrka', 'Medel', [
    'Stå på ett ben med hantel i motsatt hand',
    'Fäll i höften och låt det fria benet gå bakåt i linje med ryggen',
    'Håll höften rak – låt den inte rotera upp',
    'Res dig med kontroll. Tränar balans och höftstabilitet',
  ]],
  ['se_bencurl', 'Liggande bencurl', 'Ben', ['baksida lår'], ['vader'], 'Maskin', 'Styrka', 'Nybörjare', [
    'Ligg på mage med dynan strax ovanför hälarna',
    'Böj knäna och dra hälarna mot sätet',
    'Håll höften kvar mot dynan',
    'Sänk långsamt',
  ]],
  ['se_hamstringcurl_boll', 'Hamstringcurl på pilatesboll', 'Ben', ['baksida lår'], ['säte', 'bål'], 'Pilatesboll', 'Styrka', 'Medel', [
    'Ligg på rygg med hälarna på bollen',
    'Lyft höften till en rak linje från axlar till hälar',
    'Rulla in bollen mot sätet utan att tappa höften',
    'Rulla ut långsamt. Enbensvariant för mer utmaning',
  ]],
  ['se_nordic', 'Nordic hamstring (assisterad)', 'Ben', ['baksida lår'], ['säte'], 'Kroppsvikt', 'Styrka', 'Avancerad', [
    'Stå på knä med hälarna fastlåsta under något stabilt',
    'Luta dig långsamt framåt med rak linje från knä till huvud',
    'Bromsa så länge du kan och ta emot dig med händerna',
    'Använd gummiband runt bröstet som hjälp i början',
  ]],
  ['se_vadpress', 'Vadpress stående', 'Ben', ['vader'], ['fotled'], 'Kroppsvikt', 'Styrka', 'Nybörjare', [
    'Stå med framfoten på en kant',
    'Pressa upp så högt du kan och håll 1 s',
    'Sänk långsamt ner under kanten',
    'Gör enbens med hantel när det blir lätt',
  ]],
  ['se_vadpress_sittande', 'Sittande vadpress', 'Ben', ['vader (soleus)'], [], 'Hantlar', 'Styrka', 'Nybörjare', [
    'Sitt med fötterna i golvet och vikt på knäna',
    'Pressa upp på tå och håll 1 s',
    'Sänk långsamt',
    'Viktig för löpare – avlastar knä och hälsena',
  ]],
  ['se_kb_sving', 'Kettlebell-sving', 'Säte', ['säte', 'baksida lår'], ['bål', 'ländrygg', 'kondition'], 'Kettlebell', 'Styrka', 'Medel', [
    'Fötterna axelbrett, kettlebell framför dig',
    'Hikea bollen bakåt mellan benen med rak rygg',
    'Explodera framåt med höften – armarna är bara krokar',
    'Bollen flyter till brösthöjd. Kraften kommer från sätet, inte armarna',
  ]],
  ['se_kosack', 'Kosackknäböj', 'Ben', ['insida lår', 'säte', 'framsida lår'], ['höftrörlighet'], 'Kroppsvikt', 'Rörlighet', 'Medel', [
    'Bred benställning med tårna lätt utåt',
    'Sätt dig åt ena sidan medan det andra benet är rakt',
    'Håll hälen i golvet och bröstet uppe',
    'Byt sida via mitten. Hålls gärna i en dörrkarm i början',
  ]],
  ['se_enbensknaboj_lada', 'Enbensknäböj till låda', 'Ben', ['framsida lår', 'säte'], ['gluteus medius', 'bål'], 'Låda', 'Styrka', 'Avancerad', [
    'Stå på ett ben framför en låda eller bänk',
    'Sätt dig långsamt ner på ett ben med armarna framåt',
    'Knät får inte falla inåt',
    'Res dig på samma ben. Sänk lådhöjden successivt',
  ]],

  // ─── SÄTE & HÖFT ──────────────────────────────────────────────────────────
  ['se_hip_thrust', 'Höftlyft med skivstång (hip thrust)', 'Säte', ['säte'], ['baksida lår', 'bål'], 'Skivstång', 'Styrka', 'Medel', [
    'Övre ryggen mot en bänk, stången över höften (använd pad)',
    'Fötterna höftbrett, smalbenen lodräta i toppläget',
    'Pressa upp höften tills kroppen är rak, haka mot bröstet',
    'Krama sätet i toppen 1–2 s, sänk kontrollerat',
  ]],
  ['se_hoftlyft', 'Höftlyft på golv', 'Säte', ['säte'], ['baksida lår', 'bål'], 'Kroppsvikt', 'Styrka', 'Nybörjare', [
    'Ligg på rygg med böjda knän och fötterna i golvet',
    'Tryck ländryggen lätt mot golvet och spänn magen',
    'Lyft höften genom att trycka genom hälarna',
    'Håll 2 s i toppen. Lägg miniband över knäna för mer gluteus medius',
  ]],
  ['se_enbens_hoftlyft', 'Enbens höftlyft', 'Säte', ['säte'], ['baksida lår', 'gluteus medius'], 'Kroppsvikt', 'Styrka', 'Medel', [
    'Som höftlyft men med ena benet rakt eller uppdraget mot bröstet',
    'Pressa upp via hälen på det stödjande benet',
    'Håll bäckenet vågrätt – låt det inte tippa',
    'Sänk långsamt',
  ]],
  ['se_hoftlyft_boll', 'Höftlyft med fötterna på boll', 'Säte', ['säte', 'baksida lår'], ['bål'], 'Pilatesboll', 'Styrka', 'Nybörjare', [
    'Ligg på rygg med hälarna på pilatesbollen',
    'Lyft höften tills kroppen är rak',
    'Håll bollen stilla – det tränar stabiliteten',
    'Sänk långsamt',
  ]],
  ['se_musslan', 'Musslan med miniband', 'Säte', ['gluteus medius'], ['höftens utåtrotatorer'], 'Miniband', 'Rehab', 'Nybörjare', [
    'Ligg på sidan med böjda höfter och knän, band över knäna',
    'Håll fötterna ihop och lyft det övre knät',
    'Rulla inte bakåt med bäckenet',
    'Sänk långsamt. Ligg på den sida som inte gör ont',
  ]],
  ['se_sidoliggande_benlyft', 'Sidoliggande benlyft', 'Säte', ['gluteus medius'], ['bål'], 'Kroppsvikt', 'Rehab', 'Nybörjare', [
    'Ligg på sidan med undre benet böjt och övre benet rakt',
    'Lyft det övre benet något bakåt med tån pekande framåt',
    'Lyft bara så högt du kan utan att bäckenet rullar',
    'Sänk långsamt. Viktig för höft och trochanterbesvär',
  ]],
  ['se_monster_walk', 'Monster walk med miniband', 'Säte', ['gluteus medius', 'säte'], ['framsida lår'], 'Miniband', 'Rehab', 'Nybörjare', [
    'Bandet runt anklarna eller strax ovanför knäna',
    'Lätt knäböjsposition med spänd bål',
    'Gå framåt och bakåt diagonalt med bred bas',
    'Håll spänningen i bandet hela tiden',
  ]],
  ['se_sidosteg_band', 'Sidosteg med miniband', 'Säte', ['gluteus medius'], ['säte', 'framsida lår'], 'Miniband', 'Rehab', 'Nybörjare', [
    'Band ovanför knäna eller runt anklarna',
    'Lätt böjda knän, höften något bakåt',
    'Ta kontrollerade sidosteg utan att fötterna går ihop',
    'Håll överkroppen stilla – ingen vaggning',
  ]],
  ['se_kabel_abduktion', 'Höftabduktion i kabel', 'Säte', ['gluteus medius'], ['bål'], 'Kabel', 'Styrka', 'Nybörjare', [
    'Fotmanschett på det yttre benet, stå med sidan mot kabeln',
    'Håll i maskinen för balans',
    'För benet utåt utan att luta överkroppen',
    'Återgå långsamt',
  ]],
  ['se_kabel_kickback', 'Kabel-kickback för säte', 'Säte', ['säte'], ['baksida lår'], 'Kabel', 'Styrka', 'Nybörjare', [
    'Fotmanschett, lätt framåtlutad mot maskinen',
    'Sparka benet bakåt genom att spänna sätet',
    'Undvik att svanka i ländryggen',
    'Återgå kontrollerat',
  ]],
  ['se_copenhagen', 'Copenhagen-planka (kort hävarm)', 'Säte', ['insida lår'], ['bål', 'gluteus medius'], 'Bänk', 'Styrka', 'Medel', [
    'Sidoplanka med övre knät på en bänk',
    'Lyft höften så kroppen blir rak',
    'Undre benet kan vila eller lyftas mot bänken',
    'Håll 15–30 s. Starkt skydd för ljumske och knä',
  ]],

  // ─── AXLAR (stabilitet & styrka) ──────────────────────────────────────────
  ['se_utatrotation_band', 'Utåtrotation med gummiband', 'Axlar', ['rotatorkuff (infraspinatus)'], ['bakre axel'], 'Gummiband', 'Rehab', 'Nybörjare', [
    'Armbågen i 90° mot sidan, gärna en ihoprullad handduk under armen',
    'Rotera underarmen utåt mot bandets motstånd',
    'Armbågen stannar kvar mot kroppen',
    'Långsamt tillbaka. Lätt motstånd, 15–20 reps',
  ]],
  ['se_utatrotation_sido', 'Sidoliggande utåtrotation med hantel', 'Axlar', ['rotatorkuff (infraspinatus, teres minor)'], ['bakre axel'], 'Hantlar', 'Rehab', 'Nybörjare', [
    'Ligg på sidan, övre armbågen i 90° mot kroppen',
    'Lätt hantel – börja med 1–3 kg',
    'Rotera upp underarmen så långt det känns bra',
    'Sänk långsamt under 3 s',
  ]],
  ['se_inatrotation_band', 'Inåtrotation med gummiband', 'Axlar', ['rotatorkuff (subscapularis)'], ['bröst'], 'Gummiband', 'Rehab', 'Nybörjare', [
    'Armbågen i 90° mot sidan, bandet fäst utåt',
    'Rotera underarmen in mot magen',
    'Armbågen kvar mot kroppen',
    'Återgå långsamt',
  ]],
  ['se_utatrotation_90', 'Utåtrotation i 90° abduktion', 'Axlar', ['rotatorkuff'], ['bakre axel', 'nedre trapezius'], 'Gummiband', 'Rehab', 'Medel', [
    'Armen ut åt sidan i axelhöjd, armbågen 90°',
    'Rotera upp underarmen mot taket mot bandet',
    'Håll skuldran nere och bakåt',
    'Endast när grundrotationerna är smärtfria – tidigare efter operation, fråga fysioterapeut',
  ]],
  ['se_full_can', 'Full can-lyft', 'Axlar', ['rotatorkuff (supraspinatus)'], ['främre axel', 'serratus'], 'Hantlar', 'Rehab', 'Nybörjare', [
    'Stå med lätta hantlar och tummarna uppåt',
    'Lyft armarna 30° framför kroppen (skapulära planet)',
    'Lyft till axelhöjd, inte högre',
    'Sänk långsamt',
  ]],
  ['se_face_pull', 'Face pull', 'Axlar', ['bakre axel', 'mellersta trapezius'], ['rotatorkuff', 'rhomboideus'], 'Kabel', 'Styrka', 'Nybörjare', [
    'Rep i kabeln i ansiktshöjd, grepp med tummarna bakåt',
    'Dra repet mot ansiktet och isär händerna',
    'Avsluta med armbågarna högt och händerna utåtroterade',
    'Bästa övningen för hållning och axelhälsa',
  ]],
  ['se_band_pull_apart', 'Band pull-apart', 'Axlar', ['bakre axel', 'rhomboideus'], ['mellersta trapezius'], 'Gummiband', 'Rehab', 'Nybörjare', [
    'Håll bandet framför dig i axelhöjd med raka armar',
    'Dra isär bandet genom att föra skulderbladen ihop',
    'Undvik att dra upp axlarna mot öronen',
    'Långsamt tillbaka. Perfekt mellan set eller vid skrivbordet',
  ]],
  ['se_ytw', 'Y-T-W på lutande bänk', 'Axlar', ['nedre trapezius', 'bakre axel'], ['rotatorkuff', 'rhomboideus'], 'Hantlar', 'Rehab', 'Nybörjare', [
    'Ligg på mage på en lutande bänk eller pilatesboll',
    'Lyft armarna i Y-, T- och W-form med tummarna uppåt',
    'Fokusera på att dra skulderbladen ner och bak',
    'Mycket lätt vikt eller ingen alls, 8 reps per bokstav',
  ]],
  ['se_skulderblad_armhavning', 'Skulderbladsarmhävning', 'Axlar', ['serratus anterior'], ['bröst', 'bål'], 'Kroppsvikt', 'Rehab', 'Nybörjare', [
    'Armhävningsposition med raka armar (eller på knä)',
    'Låt bröstet sjunka mellan skulderbladen utan att böja armarna',
    'Tryck sedan isär skulderbladen så övre ryggen rundas lätt',
    'Små, kontrollerade rörelser',
  ]],
  ['se_wall_slide', 'Wall slides med skumrulle', 'Axlar', ['serratus anterior', 'nedre trapezius'], ['rotatorkuff'], 'Foamroller', 'Rehab', 'Nybörjare', [
    'Underarmarna mot en foamroller på väggen',
    'Rulla upp längs väggen samtidigt som du trycker lätt in',
    'Lyft bara så högt det är smärtfritt',
    'Kom tillbaka långsamt',
  ]],
  ['se_axelpress_hantel', 'Axelpress med hantlar (neutralt grepp)', 'Axlar', ['främre axel', 'triceps'], ['övre bröst', 'bål'], 'Hantlar', 'Styrka', 'Medel', [
    'Sitt eller stå med hantlarna vid axlarna, handflatorna mot varandra',
    'Pressa upp utan att svanka',
    'Neutralt grepp är skonsammare för axeln',
    'Sänk till axelhöjd, inte lägre om det känns i axeln',
  ]],
  ['se_landmine_press', 'Landmine-press', 'Axlar', ['främre axel', 'övre bröst'], ['serratus', 'triceps', 'bål'], 'Skivstång', 'Styrka', 'Nybörjare', [
    'Ena änden av stången i ett hörn eller landmine-fäste',
    'Håll andra änden vid axeln i halvknästående eller stående',
    'Pressa snett uppåt-framåt och låt skulderbladet följa med',
    'Den axelvänligaste pressövningen',
  ]],
  ['se_sidolyft', 'Sidolyft med hantlar', 'Axlar', ['mellersta axel'], ['trapezius'], 'Hantlar', 'Styrka', 'Nybörjare', [
    'Lätta hantlar, lätt framåtlutad',
    'Lyft armarna ut åt sidan till axelhöjd med lätt böjda armbågar',
    'Leda med armbågarna, inte händerna',
    'Sänk långsamt. Lyft i skapulära planet om axeln protesterar',
  ]],
  ['se_bottoms_up', 'Bottoms-up kettlebell-bärning', 'Axlar', ['rotatorkuff', 'underarm'], ['bål', 'axelstabilitet'], 'Kettlebell', 'Rehab', 'Medel', [
    'Håll en lätt kettlebell upp och ner (botten upp) vid axeln',
    'Armbågen under handen, greppa hårt',
    'Gå 20–30 m med stabil kettlebell',
    'Tvingar fram reflexstabilitet i axeln',
  ]],
  ['se_turkish_getup', 'Turkish get-up', 'Axlar', ['axelstabilitet', 'bål'], ['säte', 'höft'], 'Kettlebell', 'Styrka', 'Avancerad', [
    'Ligg på rygg med kettlebell i rak arm mot taket',
    'Res dig steg för steg till stående med armen rak hela tiden',
    'Blicken på kettlebellen',
    'Gå tillbaka samma väg. Börja utan vikt eller med en sko',
  ]],
  ['se_halo', 'Kettlebell halo', 'Axlar', ['axlar', 'övre rygg'], ['bål', 'axelrörlighet'], 'Kettlebell', 'Rörlighet', 'Nybörjare', [
    'Håll en lätt kettlebell upp och ner vid bröstet',
    'Cirkla den runt huvudet nära kroppen',
    'Håll bålen spänd och ingen svank',
    'Byt riktning varannan repetition',
  ]],

  // ─── BRÖST ────────────────────────────────────────────────────────────────
  ['se_armhavning', 'Armhävning', 'Bröst', ['bröst', 'triceps'], ['främre axel', 'serratus', 'bål'], 'Kroppsvikt', 'Styrka', 'Nybörjare', [
    'Händerna strax bredare än axlarna, kroppen rak',
    'Armbågarna ca 45° ut från kroppen – inte rakt ut',
    'Sänk bröstet nära golvet',
    'Pressa upp och skjut isär skulderbladen i toppen',
  ]],
  ['se_armhavning_upphojd', 'Armhävning med händerna på bänk', 'Bröst', ['bröst', 'triceps'], ['främre axel', 'bål'], 'Bänk', 'Styrka', 'Nybörjare', [
    'Händerna på en bänk eller stång',
    'Kroppen rak från huvud till hälar',
    'Sänk bröstet mot kanten',
    'Lägre höjd = tyngre',
  ]],
  ['se_hantelpress', 'Hantelpress på bänk', 'Bröst', ['bröst', 'triceps'], ['främre axel'], 'Hantlar', 'Styrka', 'Nybörjare', [
    'Ligg på bänken med skulderbladen ihop och ner',
    'Pressa upp hantlarna, gärna med lätt vinklat/neutralt grepp',
    'Sänk tills armbågarna är strax under bänkhöjd',
    'Hantlar ger axeln friare rörelse än skivstång',
  ]],
  ['se_bankpress', 'Bänkpress', 'Bröst', ['bröst', 'triceps'], ['främre axel'], 'Skivstång', 'Styrka', 'Medel', [
    'Ögonen under stången, fötterna i golvet',
    'Skulderbladen ihop och ner, lätt båge i ryggen',
    'Sänk stången kontrollerat mot nedre delen av bröstet',
    'Pressa upp. Använd smalare grepp om axeln känns',
  ]],
  ['se_hantelpress_lutande', 'Lutande hantelpress', 'Bröst', ['övre bröst', 'främre axel'], ['triceps'], 'Hantlar', 'Styrka', 'Medel', [
    'Bänken i 30° lutning',
    'Pressa upp hantlarna över bröstet',
    'Neutralt grepp är axelvänligast',
    'Sänk kontrollerat',
  ]],
  ['se_kabelpress_enarm', 'Kabelpress stående en arm', 'Bröst', ['bröst'], ['bål', 'främre axel', 'triceps'], 'Kabel', 'Styrka', 'Nybörjare', [
    'Stå i utfallsställning med ryggen mot kabeln',
    'Pressa handtaget framåt med en arm',
    'Motstå rotation i bålen',
    'Funktionell press som även tränar core',
  ]],

  // ─── RYGG ─────────────────────────────────────────────────────────────────
  ['se_latsdrag', 'Latsdrag', 'Rygg', ['latissimus'], ['biceps', 'bakre axel'], 'Kabel', 'Styrka', 'Nybörjare', [
    'Grepp strax bredare än axlarna',
    'Dra ner skulderbladen först, sedan stången mot övre bröstet',
    'Luta dig lätt bakåt utan att gunga',
    'Släpp upp kontrollerat. Neutralt grepp kan vara skonsammare för axeln',
  ]],
  ['se_chins', 'Chins (assisterad vid behov)', 'Rygg', ['latissimus', 'biceps'], ['bål', 'underarm'], 'Pull-up-stång', 'Styrka', 'Medel', [
    'Underhandsgrepp axelbrett',
    'Dra ner skulderbladen och dra bröstet mot stången',
    'Använd gummiband eller maskin som hjälp',
    'Sänk helt men kontrollerat',
  ]],
  ['se_kabelrodd', 'Sittande kabelrodd', 'Rygg', ['mellersta rygg', 'latissimus'], ['biceps', 'bakre axel'], 'Kabel', 'Styrka', 'Nybörjare', [
    'Sitt upprätt med lätt böjda knän',
    'Dra handtaget mot magen och skulderbladen ihop',
    'Håll bröstet uppe, ingen gungning',
    'Sträck fram armarna och låt skulderbladen glida isär',
  ]],
  ['se_hantelrodd', 'Enarms hantelrodd', 'Rygg', ['latissimus', 'mellersta rygg'], ['biceps', 'bakre axel', 'bål'], 'Hantlar', 'Styrka', 'Nybörjare', [
    'Ena handen och knät på en bänk, rak rygg',
    'Dra hanteln mot höften',
    'Armbågen nära kroppen',
    'Sänk långsamt med full sträckning',
  ]],
  ['se_brostodd_rodd', 'Bröststödd hantelrodd', 'Rygg', ['mellersta rygg', 'bakre axel'], ['latissimus', 'biceps'], 'Hantlar', 'Styrka', 'Nybörjare', [
    'Ligg på mage på en lutande bänk',
    'Dra hantlarna upp och för ihop skulderbladen',
    'Ingen belastning på ländryggen',
    'Sänk långsamt',
  ]],
  ['se_trx_rodd', 'TRX-rodd', 'Rygg', ['mellersta rygg', 'latissimus'], ['biceps', 'bakre axel', 'bål'], 'TRX', 'Styrka', 'Nybörjare', [
    'Håll handtagen, luta dig bakåt med rak kropp',
    'Dra bröstet mot händerna och skulderbladen ihop',
    'Mer lutning = tyngre',
    'Sänk kontrollerat',
  ]],
  ['se_raka_armar_pulldown', 'Pulldown med raka armar', 'Rygg', ['latissimus'], ['bål', 'triceps (långa huvudet)'], 'Kabel', 'Styrka', 'Nybörjare', [
    'Stå framför kabeln med rep eller stång i höjd',
    'Raka armar, fäll lätt i höften',
    'Dra ner till låren med latsen',
    'Låt armarna gå upp långsamt',
  ]],
  ['se_rygglyft', 'Rygglyft 45°', 'Rygg', ['ländrygg', 'säte'], ['baksida lår'], 'Maskin', 'Styrka', 'Nybörjare', [
    'Höften strax ovanför dynan',
    'Sänk överkroppen med rak rygg',
    'Lyft till rak linje – inte översträckt',
    'Spänn sätet i toppen',
  ]],
  ['se_dead_hang', 'Häng i stång', 'Rygg', ['greppstyrka', 'latissimus'], ['axlar', 'axelrörlighet'], 'Pull-up-stång', 'Rörlighet', 'Nybörjare', [
    'Häng med raka armar, tårna kan nudda golvet',
    'Aktivt häng: dra ner skulderbladen lite',
    'Andas lugnt i 20–40 s',
    'Försiktigt efter axeloperation – avlasta med fötterna',
  ]],

  // ─── ARMAR ────────────────────────────────────────────────────────────────
  ['se_bicepscurl', 'Bicepscurl med hantlar', 'Armar', ['biceps'], ['underarm'], 'Hantlar', 'Styrka', 'Nybörjare', [
    'Stå med hantlarna längs sidorna',
    'Böj armarna utan att flytta armbågarna',
    'Vrid upp handflatorna i toppen',
    'Sänk långsamt',
  ]],
  ['se_hammarcurl', 'Hammarcurl', 'Armar', ['biceps', 'underarm'], [], 'Hantlar', 'Styrka', 'Nybörjare', [
    'Handflatorna mot varandra',
    'Böj armarna med stilla armbågar',
    'Pausa i toppen',
    'Sänk långsamt',
  ]],
  ['se_tricepspress_kabel', 'Tricepspress i kabel', 'Armar', ['triceps'], [], 'Kabel', 'Styrka', 'Nybörjare', [
    'Rep eller stång i kabeln, armbågarna mot sidorna',
    'Sträck armarna ner helt',
    'Armbågarna stannar på samma plats',
    'Låt upp långsamt',
  ]],

  // ─── BÅL ──────────────────────────────────────────────────────────────────
  ['se_planka', 'Plankan', 'Bål', ['djup bål', 'raka magmuskeln'], ['axlar', 'säte'], 'Kroppsvikt', 'Styrka', 'Nybörjare', [
    'Underarmarna i golvet, armbågarna under axlarna',
    'Kroppen rak, spänn sätet och dra naveln lätt inåt',
    'Andas lugnt',
    'Hellre 3×20 s perfekt än 1 min med svank',
  ]],
  ['se_sidoplanka', 'Sidoplanka', 'Bål', ['sneda magmuskler', 'gluteus medius'], ['axel'], 'Kroppsvikt', 'Styrka', 'Nybörjare', [
    'Ligg på sidan med armbågen under axeln',
    'Lyft höften till en rak linje',
    'Börja med knäna i golvet vid behov',
    'Håll 15–30 s per sida',
  ]],
  ['se_dead_bug', 'Dead bug', 'Bål', ['djup bål'], ['höftböjare'], 'Kroppsvikt', 'Styrka', 'Nybörjare', [
    'Ligg på rygg, armarna mot taket och knäna i 90°',
    'Tryck ländryggen mot golvet',
    'Sträck ut motsatt arm och ben långsamt',
    'Ländryggen får inte lyfta. Byt sida',
  ]],
  ['se_bird_dog', 'Fågelhunden', 'Bål', ['djup bål', 'ländrygg'], ['säte', 'axlar'], 'Kroppsvikt', 'Styrka', 'Nybörjare', [
    'På alla fyra, händerna under axlarna',
    'Sträck ut motsatt arm och ben',
    'Håll bäckenet vågrätt – tänk att du har ett glas vatten på ryggen',
    'Håll 3 s och byt sida',
  ]],
  ['se_pallof', 'Pallof press', 'Bål', ['sneda magmuskler', 'djup bål'], ['säte'], 'Kabel', 'Styrka', 'Nybörjare', [
    'Stå med sidan mot kabel eller band i brösthöjd',
    'Håll handtaget mot bröstet',
    'Pressa rakt fram och motstå att bli vriden',
    'Håll 2 s ute och dra tillbaka',
  ]],
  ['se_farmers_walk', 'Bondgång (farmer\'s walk)', 'Bål', ['greppstyrka', 'bål', 'trapezius'], ['ben', 'axelstabilitet'], 'Hantlar', 'Styrka', 'Nybörjare', [
    'Tunga hantlar eller kettlebells i båda händerna',
    'Stå upprätt med skuldrorna nere och bak',
    'Gå med korta, kontrollerade steg',
    '30–40 m eller 30–45 s',
  ]],
  ['se_resvaska', 'Resväskebärning (en hand)', 'Bål', ['sneda magmuskler', 'gluteus medius'], ['greppstyrka'], 'Kettlebell', 'Styrka', 'Nybörjare', [
    'En kettlebell i ena handen',
    'Gå rakt utan att luta åt sidan',
    'Spänn bålen som om någon försöker knuffa dig',
    'Byt hand. Utmärkt för ländrygg och höft',
  ]],
  ['se_utrullning_boll', 'Utrullning på pilatesboll', 'Bål', ['raka magmuskeln', 'djup bål'], ['latissimus', 'axlar'], 'Pilatesboll', 'Styrka', 'Medel', [
    'Stå på knä med underarmarna på bollen',
    'Rulla fram så långt du kan utan att svanka',
    'Dra tillbaka med magen',
    'Svårare variant: magrulle',
  ]],
  ['se_stir_the_pot', 'Stir the pot', 'Bål', ['djup bål', 'sneda magmuskler'], ['axlar'], 'Pilatesboll', 'Styrka', 'Avancerad', [
    'Plankposition med underarmarna på pilatesbollen',
    'Rita små cirklar med armbågarna',
    'Håll höften stilla och ingen svank',
    'Byt riktning efter några varv',
  ]],
  ['se_hollow_hold', 'Hollow hold', 'Bål', ['raka magmuskeln', 'djup bål'], ['höftböjare'], 'Kroppsvikt', 'Styrka', 'Medel', [
    'Ligg på rygg och tryck ländryggen mot golvet',
    'Lyft axlar och ben lätt från golvet',
    'Böj knäna för lättare variant',
    'Håll 15–30 s',
  ]],
  ['se_kabel_chop', 'Kabelhugg diagonalt', 'Bål', ['sneda magmuskler'], ['axlar', 'säte'], 'Kabel', 'Styrka', 'Nybörjare', [
    'Kabeln högt, stå med sidan mot maskinen',
    'Dra handtaget diagonalt ner mot motsatt höft',
    'Rotera via höften och bröstryggen – inte ländryggen',
    'Återgå långsamt. Gör även nerifrån och upp (lyft)',
  ]],
  ['se_mcgill_curl', 'McGill curl-up', 'Bål', ['raka magmuskeln'], ['djup bål'], 'Kroppsvikt', 'Rehab', 'Nybörjare', [
    'Ligg på rygg med ett ben böjt, händerna under ländryggen',
    'Lyft huvud och axlar några centimeter med neutral nacke',
    'Håll 8–10 s',
    'Ryggvänlig magövning utan att runda ländryggen',
  ]],
  ['se_bjorngang', 'Björnkrypning', 'Bål', ['bål', 'axlar'], ['säte', 'framsida lår'], 'Kroppsvikt', 'Styrka', 'Nybörjare', [
    'På alla fyra med knäna några cm från golvet',
    'Kryp framåt och bakåt med motsatt hand och fot',
    'Håll ryggen platt och höften låg',
    'Bra uppvärmning för axlar och bål',
  ]],

  // ─── RÖRLIGHET ────────────────────────────────────────────────────────────
  ['se_hoftbojarstretch', 'Höftböjarstretch i knästående', 'Rörlighet', ['höftböjare'], ['framsida lår'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'Halvknästående med bakre knät på en matta',
    'Spänn sätet på bakre benet och tippa bäckenet bakåt',
    'Skjut höften försiktigt framåt',
    'Håll 30–45 s per sida. Motverkar stillasittande',
  ]],
  ['se_9090', '90/90 höftrörlighet', 'Rörlighet', ['höftrotatorer'], ['säte'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'Sitt med båda knäna i 90°, ett framför och ett åt sidan',
    'Luta dig fram över främre benet med rak rygg',
    'Byt sida genom att vrida knäna över',
    '5–8 byten åt varje håll',
  ]],
  ['se_varldens_basta', 'Världens bästa stretch', 'Rörlighet', ['höft', 'bröstrygg'], ['baksida lår', 'höftböjare'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'Långt utfall med bakre knät i golvet eller rakt',
    'Sätt ner samma hand som främre foten innanför foten',
    'Rotera upp den andra armen mot taket',
    '5 reps per sida som uppvärmning',
  ]],
  ['se_open_book', 'Öppen bok (bröstryggsrotation)', 'Rörlighet', ['bröstrygg'], ['bröst', 'axlar'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'Ligg på sidan med böjda knän och armarna raka framför dig',
    'Öppna övre armen som en bok mot andra sidan',
    'Följ handen med blicken, knäna stannar ihop',
    'Håll 2–3 s och återgå. 8 reps per sida',
  ]],
  ['se_katt_ko', 'Katten och kon', 'Rörlighet', ['ryggrad'], ['bål'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'På alla fyra',
    'Runda ryggen uppåt och dra in hakan',
    'Svanka mjukt och lyft blicken',
    'Långsamt i takt med andningen, 8–10 reps',
  ]],
  ['se_foamroller_brostrygg', 'Bröstryggsextension på foamroller', 'Rörlighet', ['bröstrygg'], ['axlar'], 'Foamroller', 'Rörlighet', 'Nybörjare', [
    'Foamrollern tvärs under bröstryggen, händerna bakom huvudet',
    'Luta dig bakåt över rullen utan att svanka i ländryggen',
    'Flytta rullen några cm i taget',
    'Motverkar framåtlutad kontorshållning',
  ]],
  ['se_duvan', 'Duvan (sätesstretch)', 'Rörlighet', ['säte', 'piriformis'], ['höftrotatorer'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'Främre benet böjt framför dig, bakre benet rakt bakåt',
    'Luta dig framåt med rak rygg',
    'Alternativ: ligg på rygg och lägg foten över motsatt knä (figur 4)',
    'Håll 30–60 s per sida',
  ]],
  ['se_hamstring_band', 'Baksida lår-stretch med band', 'Rörlighet', ['baksida lår'], ['vader'], 'Gummiband', 'Rörlighet', 'Nybörjare', [
    'Ligg på rygg med bandet runt foten',
    'Lyft det raka benet tills du känner stretch',
    'Andra benet ligger kvar i golvet',
    'Håll 30–45 s per sida',
  ]],
  ['se_fotled_vagg', 'Fotledsrörlighet mot vägg', 'Rörlighet', ['fotled', 'vader'], ['knä'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'Stå i utfall med främre foten en bit från väggen',
    'För knät mot väggen utan att hälen lyfter',
    'Flytta foten längre bak när det blir lätt',
    '10 reps per sida. Bättre fotled = mindre knäbelastning',
  ]],
  ['se_axel_cars', 'Axelcirklar (CARs)', 'Rörlighet', ['axelled'], ['skulderblad'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'Stå upprätt och spänn bålen',
    'Gör en så stor och långsam cirkel med armen som möjligt',
    'Bara kroppen arbetar i axeln – resten är stilla',
    '3–5 långsamma varv åt varje håll',
  ]],
  ['se_hoft_cars', 'Höftcirklar (CARs)', 'Rörlighet', ['höftled'], ['bål'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'Stå med stöd mot en vägg, lyft ena knät',
    'Rita en stor långsam cirkel med knät: framåt, ut, bakåt',
    'Bäckenet stannar stilla',
    '3–5 varv åt varje håll',
  ]],
  ['se_vaggangel', 'Väggänglar', 'Rörlighet', ['bröstrygg', 'nedre trapezius'], ['axlar'], 'Kroppsvikt', 'Rörlighet', 'Nybörjare', [
    'Ryggen mot väggen, ländryggen lätt mot väggen',
    'Armarna i W-position mot väggen',
    'Glid upp till Y och ner igen med kontakt i väggen',
    'Bara så högt du kan utan smärta',
  ]],
  ['se_foamroller_lar', 'Foamroller lår och säte', 'Rörlighet', ['framsida lår', 'säte'], [], 'Foamroller', 'Rörlighet', 'Nybörjare', [
    'Rulla långsamt framsida lår och sätet',
    'Stanna på ömma punkter 20–30 s',
    'Undvik att rulla direkt på utsidan höft vid trochanterbesvär',
    '1–2 min per område',
  ]],

  // ─── KONDITION ────────────────────────────────────────────────────────────
  ['se_roddmaskin', 'Roddmaskin', 'Kondition', ['kondition', 'rygg', 'ben'], ['bål'], 'Maskin', 'Kondition', 'Nybörjare', [
    'Ben – kropp – armar på vägen bak',
    'Armar – kropp – ben på vägen fram',
    'Rak rygg, kraften från benen',
    'Logga meter som reps eller använd tid',
  ]],
  ['se_cykel', 'Motionscykel / airbike', 'Kondition', ['kondition', 'framsida lår'], ['säte'], 'Maskin', 'Kondition', 'Nybörjare', [
    'Ställ in sadeln så knät är lätt böjt i nedersta läget',
    'Uppvärmning 5–10 min eller intervaller',
    'Knävänlig kondition',
    'Logga minuter som reps',
  ]],
  ['se_skierg', 'SkiErg', 'Kondition', ['kondition', 'latissimus', 'bål'], ['triceps', 'ben'], 'Maskin', 'Kondition', 'Medel', [
    'Stå nära maskinen med handtagen ovanför huvudet',
    'Dra ner med armar och bål samtidigt som du böjer i höft och knä',
    'Res dig och låt armarna gå upp',
    'Lugn axelrörelse om axeln är känslig',
  ]],
  ['se_slade', 'Slädpush', 'Kondition', ['framsida lår', 'säte'], ['kondition', 'vader'], 'Släde', 'Kondition', 'Nybörjare', [
    'Händerna på slädens stänger, kroppen framåtlutad',
    'Driv framåt med korta, kraftfulla steg',
    'Rak linje från huvud till bakre häl',
    'Mycket knävänligt – ingen excentrisk belastning',
  ]],
];

// Exercises logged in seconds instead of reps (holds, carries, stretches, cardio)
const TIME_BASED = new Set([
  'se_spansk_knaboj',
  'se_vaggsittning',
  'se_copenhagen',
  'se_bottoms_up',
  'se_dead_hang',
  'se_planka',
  'se_sidoplanka',
  'se_farmers_walk',
  'se_resvaska',
  'se_hollow_hold',
  'se_hoftbojarstretch',
  'se_duvan',
  'se_hamstring_band',
  'se_foamroller_lar',
  'se_roddmaskin',
  'se_cykel',
  'se_skierg',
  'se_slade',
]);

export function loadSwedishExercises(): Exercise[] {
  return RAW.map(([id, name, group, primary, secondary, equipment, category, level, steps]) => ({
    id,
    name,
    category,
    primaryMuscles: JSON.stringify(primary),
    secondaryMuscles: JSON.stringify(secondary),
    equipment,
    bodyPart: group,
    gifUrl: null,
    instructions: steps.join('; '),
    difficulty: level,
    measure: TIME_BASED.has(id) ? 'time' : 'reps',
  }));
}

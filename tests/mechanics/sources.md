# Processed Sources

Ledger of every source PDF already folded into `index.md`, **keyed by content
hash** so it survives renames. A file is processed iff its full `sha256` appears
in the Hash column below — its current filename is irrelevant. (Process:
`CLAUDE.md` → "Mechanics catalog (PDF extraction)".)

Compute a file's hash yourself with the system tool — never script the ledger;
add rows by hand as you process each file:

```bash
sha256sum "<file>"
```

- A **hash present** = processed; don't re-scan it. A file in `pdfPath` whose
  hash is **not** listed is unprocessed — scan it (or add it as `skipped`). A new
  release of a book has different bytes → a new hash → it won't match → it gets
  re-scanned, which is the point.
- **Notes** carries the detail: `skipped — <reason>` for files with no
  extractable mechanics; `via IR Vol N` for a DLC already covered by scanning
  that Interface RED volume (don't re-scan it standalone); a version caveat where
  the library copy is newer than what was originally scanned.

**Always ignore — never scan, regardless of hash:** any **Jumpstart Kit** file
(filename `RTG-CPR-JSK_*`, or containing `Jumpstart`/`JSK`) and any **Easy Mode**
file (`EasyMode`/`Easy-Mode`). They restate a subset of the core rules — no
canonical or new mechanics.

**Processed but no longer in the library** (content already in `index.md`, so no
hash row): All About Drones (via Vol 1).

| Source | Hash (sha256) | Notes |
| --- | --- | --- |
| 12 Days of Cutiemas | `4e47ff7635d7e5970058eccee529dd70d11d3b7a70b5e75b15de0cdc7e715570` | scanned |
| 12 Days of Cybermas | `eca8428614ea88994228d703629a68d68abbc66ea3cdb8e96a3468d7125cca07` | via IR Vol 3 |
| 12 Days of Gearmas | `9595cd5c581816877d29255eb8f80e8498b94d90c27fce6b8f80c289a1d3e343` | via IR Vol 4 |
| 12 Days of Gunmas | `6bac38a20d841dda90a2f8d22503bbef8551fbd710dbc5f7e10b3de1136c9957` | scanned |
| 12 Days of REDmas | `b6ac67bf19443df7242e2ca46af9112aec917ad1401cec4ae45b8ad523659e00` | via IR Vol 5 |
| 12 Days of Vehiclemas | `f91e6ac33ee165f7e9372706e10c2e5d1f907aeda06bf0364559214fe828343d` | scanned |
| Achievements and Loot Boxes | `2438eb36b61a9f772be754965fceae199cfd0cb11538e96499b87326e47c5b0e` | via IR Vol 4 |
| All About Agents | `2eb0d5c193b61d67df81f1203822d7d10c85e004a434243623b051b1b87f31fc` | via IR Vol 5 |
| Black Chrome | `acd858908e0e96b9f92c9666f1b2bf7c8259fa8dcd6abce79b157dd5a9d9cd5b` | scanned (v1.5) |
| Black Chrome Plus | `285c06731d68c173534b91837f3370825851a2e587df66957f9901db7f0bc38a` | via IR Vol 4 |
| Breaking Your Stuff | `05dbf21329103cecb2698e97a70141c42072ce7f319c8648f4365b83e0638f58` | via IR Vol 5 |
| Cargo Containers and Cube Hotels | `8d22708e1ea464a7ef19d49d9b83156235dbf9a87b5cf6ec458b51cceb70eb6d` | via IR Vol 2 |
| CEMK Edgerunners Handbook | `ec035fbae6ab0a79f31194108375fc3b8e46d4eab7eb35caad4c87b9e12822d2` | scanned |
| CEMK Rule Book | `39040d634ca7a76a38289559612c0f853a173a7d5f7953b9ed781dcfeacef430` | scanned |
| Chasing the Rabbit | `f38efae2ed40c2973aff22527f5bc375b40e6c555a2505e828df4bfd4a281143` | via IR Vol 5 |
| Collecting the Random | `015a36e5ae9fe7f6954a1e3c6e283ec4b80438adb76f177480ab4107741f41a9` | via IR Vol 3 |
| Conapts and Apartments | `65ea1dddd098c8c9819a98683d2bdea981b22a1ba026c0670f55ef6605b1bdfa` | via IR Vol 4 |
| Cyberchair | `edc8d7e6d95de75095dd58a9f576cf5430d7e53b45f28c51d8f62be4bfee6a9b` | via IR Vol 1 |
| Cyberpunk RED Core | `c97bd6967f5884cd1ec4a5273ddf3d6e34be3522ca52aac3968847f1b064b360` | scanned |
| Cyberpunk RED Core FAQ | `e05af57307715ebe0562f8c022fff91dc6f48a2606c71370f8dfcbfd63b16423` | reconciled at v1.2; library copy is v1.3 — re-reconcile |
| Cyberpunk RED Errata | `d9c16d315872567e17d953b067d636dea1cea0ac0504f1635b0a5b35f0e54129` | scanned — core corrections folded |
| Cyberware Enhancements | `9973f3ef42fb2d67c28bf55b8eec7a242fbe2417e30524d343c69e9d131ebdfa` | scanned (2077) |
| Danger Gal Dossier | `23e5461fed8a1af9e08d166e04bb750d668d473686362b8eefbbd6c27cf085a7` | scanned |
| Danger Gal Dossier Plus | `0b210d466b7b843431246dfc199f766ecded705b35513a878140170b1264aec2` | scanned |
| Did Someone Say Murder | `88c56d100121891ea94fe6345bdf3aa4d40c429007597f56ae971d0c4f7e436e` | via IR Vol 5 |
| Digital Dating | `75abc9962bcb624eda0e37753bf6bec3ecfbf1a9f27f048ee285ed40147cf4bc` | via IR Vol 3 |
| Dreaded Punknaught | `bf4b86f84880fe68e6a6c37909ddb57ebbe50bd94c2129792c3c3ef50a31287a` | via IR Vol 4 |
| Elflines Online Daerics Guide | `57dfa306f0821fcc70cc827823f45b69a08c24c20b0df9f4085968a11243a237` | via IR Vol 2 |
| Elflines Online | `b7eb0cd8aafe737750d6931bb1645c75021fc52d66e354f9467410256a795475` | via IR Vol 1 |
| Elflines Online EP1 | `238fa9554c8daae8abf20bfe888bc91503c267e37e616324393a863a33c12331` | via IR Vol 1 |
| Elflines Online Magic Returns | `5c7f62eac310f7f1a76c578b1e92f938cc24403787e879c56ce55008c182ab2a` | scanned |
| Elflines Online the TCG | `2eebc5022df107f0f26c27e2b6f4150e54dc3997954dcbad0cab27a1446ed771` | via IR Vol 3 |
| Everyday People | `a1eec91226da6226194debfaed4e877e928cbefa34aeff9b6f85f07d93c8b491` | scanned |
| Fast and Furriest | `b6a86c83204b90bc985eb8f62865be9e31c32321845d24793eab78fa9d93e175` | scanned |
| Going Quiet | `de839434fc8e08ec969ead80fbc06773521b6bb5931dc30db5a674bd103bc519` | scanned |
| Halloween Screamsheets | `fdf2247093de9e85bf3d6ac800a0e73a4d93630f47832a4824c74a0799b4f02a` | via IR Vol 4 |
| Hardened Lieutenants | `05bb71ba729aee3897086e59f465adcc2124beffb5e0292d782608d48284a737` | via IR Vol 2 |
| Hardened Mini Bosses | `3a9e4b5e03a32209992e02ba78d4ac8ebb7be05e067e4b5038cd19b8fedcd72b` | via IR Vol 3 |
| Hardened Mooks | `84a46d9dc0b16efdf30f3a991ed26e9967c607e5cbc48ed9f3aa857f578cd05e` | via IR Vol 2 |
| Hope Reborn Plus | `aaa108c68d87a8c2a5da9619cbacca95b0021e7fd1dd4a674621a81dffcd8754` | scanned |
| Hope Reborn Plus | `f95a30880c4eb4c74bbe2120e7d28fe819394fd1dcd9979f58fb9f62fba2c85d` | scanned (v1.1; same gear as the unversioned copy) |
| Hornets Phramacy | `e2a180c63280b6feb50636b380994a63db18111c5466c302ccf19bb8fdc6b6cb` | via IR Vol 4 |
| Hot Pursuit | `4db93b6af0b6fafa59ad1e25f67272f175d3ca3461cdb6391b42d2a11ac506b0` | scanned |
| Invented Tech Upgrades | `fda23ac7de2b281acbd4dc4a31c785c68f570af63fb56973a028b677c5ff32f5` | scanned |
| Interface RED Vol 1 | `25ddfee4e84626b7424faf563b841b4c2895c7119745ac0540a655e4649da4de` | scanned |
| Interface RED Vol 2 | `8583d2002ce6ce4a680d4c70fb8139cffa3dfb15a8ae0408c86a52d34520fd7f` | scanned |
| Interface RED Vol 3 | `28d23b415db1a6f1bdd67bba7b11e7ed3972b2ee79dd56a5fc4930a903654f1f` | scanned (Going Metal / FBC) |
| Interface RED Vol 4 | `531e55e2b8e8082957fd93da0b9cabeacc9eda34b729fd043efcb2719ae89d3e` | scanned |
| Interface RED Vol 5 | `01a8ed02a85588616af5f95436e2143cecf31784b2cea7056c9b2f5471bb4891` | scanned |
| JSK Conversion Guide | `9348057c45552141fc5ee612c46096db83b9b8956082333990ad01c2cced24b0` | via IR Vol 2 |
| Micro Chrome | `016b5301c37933126acef61d15230c3aa8e6fb66d88b0c97a01994509b689f6c` | scanned |
| Midnight With the Upload | `e176ad65e398557bbd8c2fbc3fc16149c0eb185f7e4f10b9880479da33919a86` | via IR Vol 3 |
| Mixing Drinks Changing Lives | `e5a26eac49c131a42fc0a738aaee658a28603a54b58d2f80e1090426eeb8d809` | scanned |
| Must Have Cyberware Deals | `7ea584fea0c9a3d8e0f78e5743dbdeeed1ab16e6250f576253391013a06717e1` | via IR Vol 3 |
| Night City Weather | `537b56127c189bcf67806cc6e5a7df7b3d8931c0c96002c3bfd25d3021dfee32` | via IR Vol 2 |
| No Place Like Home | `400a828ad4b695eff8aec76555e7d4eb492615fc684cd79f331aa24324feea7f` | scanned |
| Old Guns Never Die | `f81ef312443caaa49deeed6e1fbba05688e8b41d17a5ecffb58ae29f444a7942` | via IR Vol 1 |
| Red Chrome Cargo | `6de265d65fd710d10698c3551d2b5da3f2ce2304e69fd7f87dc217040c5c9e0e` | via IR Vol 1 |
| Salvaging Night City | `f405e3e08b4599dfb6263225bd66cc03ec13a8c79a6f370d5da6543386ee5aad` | via IR Vol 3 |
| Screamsheet Generator | `b4c2f0d358f8788a362f04c67dbb1925b26c0245b6d59ef0e710771e41ccd83a` | via IR Vol 5 |
| Seeing Double | `ef07cc384227885844ff6b196d0a864910a6b5f47da2d745f9d50442bc7c59de` | scanned — Blue Period pistol + security devices |
| Segotari Power | `49d293efc9b857d662fc72deab08c5eae00cb944c401fbefffd96d3df46e3c9e` | scanned — optional table minigames |
| Single Shot Pack | `6586c785f8c159f14f9a747cfeba65654391a1bf08111ef3b6f49a08dd64dd34` | via IR Vol 1 |
| So You Missed GenCon | `c39988c7001d09307cb1634b5634ac68dc691e9ed536a005b11aaa50360c1705` | scanned — hazards, Radiation Suit, chase/MA bits |
| Spinning Your Wheels | `77bc830661985817df8015cdb2c38aacb39c0eb80eb1cadf613c55aff4c6fe0f` | via IR Vol 3 |
| Stickball | `024b39f6c127f91c777e9dc226a94cd96213af3188eb973e086df181051b2318` | via IR Vol 4 |
| Tales of the Red HopeReborn | `2f5e665ebdb86253a5802e74fe029aab7be40c9339dba2a674bb523b365bad6d` | scanned |
| Tales of the Red Street Stories | `bc32cfdf0314f541038a2e699c10354c68bdc0824b18db1d1ad894eddcabe426` | scanned |
| Toggles Temple | `5e24477aa944cd9567a6f89769cf4e5c17992e6276d6a8d9f5aec70f987d2e7b` | via IR Vol 5 |
| Woodchippers Garage | `81e72d2933ec23bc15f875c60d546563b0f0953cea80e46e40c252ecfd0e2323` | via IR Vol 3 |
| Your New Best Friend | `eb04b2b5e164adfc4e94fcb822d229cf774f8cb92c4683505b2c4f362f6af72e` | via IR Vol 5 |
| 100 Logos | `b8c7f0fb785ad10c44c0e225f0f9cfcc70b5fdc7f7ba89a78c5836e8b3707c96` | skipped — logos/art |
| CEMK Edgerunners Folios 11x17 | `30008d7e6033d93c38faf9e905a92d0caf3438652e2e0d0a933451260e4bcfb8` | skipped — folio |
| CEMK Edgerunners Folios LTR | `ccff277ee178660974383fd28a1bed6275158a7201ecfe26eecf3a6384d5d9f5` | skipped — folio |
| CEMK Intro Sheet | `3aab8bb6e0b1b22d0548c00fc7859da5afc53e6aef33440757d32b96ba446714` | skipped — intro sheet |
| CEMK Maps | `1c88926ffe6ef642d63dbeff1d95a3835277eade034ed4c12f81378b852adeb9` | skipped — maps |
| CEMK The Jacket | `bd9765136c3516f5e99b77b358f7daab770dfd8e65d9ff547c9b227f77fc9aff` | skipped — adventure |
| CEMK Token Sheet | `4c3db7bd6a74b2338d5d359715600f8689a9fefa4e30c1ab6db7fd131d8991c0` | skipped — tokens |
| Character Sheet | `d9e426cfa124a6c478a46e47ac84eaeea539dfbfa415ea35c9edd0a5a599598e` | skipped — character/mook sheet |
| Character Sheet Fillable | `95085ae1ec70442cb2ec26113016dfea049bf1e25bfdac7449ff8d03e8308e65` | skipped — character/mook sheet |
| Charsheet CLC | `96af3c18aebcd3cd11eb884ccdafc81d0523abcd7f34afa5ff9cd86b3a53c646` | skipped — character/mook sheet |
| Charsheet CLC Form | `4c80ad71c4f5e72fdfcabc75084274f669ab29ecec8d22f73e10d9ef7bdaed59` | skipped — character/mook sheet |
| Checklist | `b599a6fe24586fa99c22d650a7b528e26dd844c72cce6894b91267283f892fec` | skipped — product/release catalog (no rules) |
| CPRedDataScreenPreview | `c12457515314ea953e4ebb39978084b821c9b59a486039821445f4e357f35684` | skipped — GM screen |
| Dark Future Dice Characters | `eb4589732b91ee97c8e31634c93fe87a82277648b8a0cf6d0724305b6aa65b79` | skipped — Jumpstart Kit (always ignored) |
| DataPack Booklet | `61b022e18913515194c7496195f8c93e974eb41c56a25547b472f4111cc8a9ad` | skipped — lore/setting |
| DataPack Character Sheet Black&White | `4053b11dc845eb5fb92f21ad15d9508a645e955880c828b29b1dbdb4f65ffc71` | skipped — character/mook sheet |
| DataPack Character Sheet Black&White Form | `d120ca411de6d4e20665f4e9181bd8a745e145a2e471b1fff0a8bb6540ae827a` | skipped — character/mook sheet |
| DataPack Maps | `a5f38e2a0caa2dedb32b9e4bcc2597d5df111d2385490421514e7c60184c3834` | skipped — maps/art |
| DataPack Sleeve | `5ebb260e44b9e5056324e53fe48eba784dd3968beedea60b52c378e2b47858a3` | skipped — maps/art |
| DataScreen DigitalGMSide | `3f79e8fc813676cf2d01a9ad4971f23645095c7a2a1deeb3488b72486f247187` | skipped — GM screen |
| DataScreen DigitalGMSide NightMode | `e7447c58856bd5dc7d7914d598656ed86eb1bd12393a5ab35723a4dee9c7685e` | skipped — GM screen |
| DataScreen DigitalPlayerSide | `03668312ecb4b4896cbc23c561ee77a36f46f85a0db7ece168aa8179a5db4a7a` | skipped — GM screen |
| Edgerunner Folio | `8d7bfa26a44f792113360b013e89d8293fd809b1ff572b8c3c68c23f3617de93` | skipped — folio/character sheet |
| Edgerunner Folio Form Fillable | `74fc3df71a56b169fc736a134b4fb4917661c5411dbce477f4fe3ed232123ac8` | skipped — folio/character sheet |
| Elflines Online WorldMap | `c7f4d3deb9ac175188220e77b128c4c21bb7a58f68f81316817e3cb9b8dba4ee` | skipped — map |
| HSG Chars | `9a3a27a97615ad512fbb15ea4723148bb7df21e9368d909ab4e0b46c2b0dab2a` | skipped — Jumpstart Kit (always ignored) |
| Karaoke Night | `33c6bc0a16b5f94b9f170a62ba41c8ae2c20b3a3e8b0747ccddd8138854b8d8c` | skipped — adventure module (no new mechanics) |
| Listen Up JonJon | `810debd066aeb32698dc7898d0eee1a30f69bbf61a5843745e456a0872fb044f` | skipped — adventure/screamsheet |
| Listen Up Rob Mulligan | `f8856d480b5488cd879013df21ff676bf6d59e24be664173e0ee7a62aa70ec25` | skipped — adventure/screamsheet |
| Mook Sheet Fillable | `1310f322893310cd81aab489fa30fa9e2a859213cd8320d9116409ba58f77914` | skipped — character/mook sheet |
| Night City Atlas | `85a672ea7890c5c80058b53966a8405e9cf166c69fcf70dd8ed6d8fe789b4cf6` | skipped — setting/lore |
| Night City Tarot | `bbf1827a14c504bc2fc9c29d0caa7876a3f604762423b07b0acb18951a820284` | skipped — tarot deck |
| Night Market Index | `e11623b5938f31e1f15ecfd611d9ce2056775a9e5a3ac09bba6b722af5b2b96f` | skipped — item index, no rules |
| Red Chrome Cargo | `8813fd78f757bbb451f72accb5083d8882bdaafa738177112342dff8f9047571` | skipped — Jumpstart Kit (always ignored) |
| Rockerboy Index | `e6a435537bad626bd5a25968059591904f3c2f54a4e00e94e73754e22d66e0b1` | skipped — index |
| Single Player Mode Plus | `82034ee22545a34de386082226468012f074f3275d45ad32119a2f688dab3c86` | skipped — solo oracle/lookup tables (verbatim) |
| Tales of the Red Plus | `8048dda4b4c41f8224039a96a0d3691334da5818444766a866bad829e4ae67d0` | skipped — adventure reprints |
| The Apartment Map | `37cbd443ce00b95315a18c65627221e4e4720ad6b98a1ed8341eb1c6b8ca693f` | skipped — Jumpstart Kit (always ignored) |

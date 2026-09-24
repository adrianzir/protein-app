-- Spec 001 · T4: catálogo base global (LatAm, España, EE. UU.) — R3.1, R3.7.
-- Valores por 100 g de porción comestible, basados en USDA FoodData Central (SR Legacy / FNDDS),
-- redondeados a 1 decimal. Preparaciones típicas sin equivalente USDA exacto se marcan "aprox.".
-- Nombre principal en español neutro; `aliases` incluye variantes regionales y el nombre en inglés.
-- Idempotente: se actualiza por `slug` (on conflict), así futuras migraciones pueden corregir valores.

insert into public.foods (source, slug, name, aliases, kcal_100g, protein_100g, carbs_100g, fat_100g)
select 'catalog', v.slug, v.name, v.aliases, v.kcal, v.protein, v.carbs, v.fat
from (values
  -- Carnes, aves y pescados
  ('pechuga-pollo-cocida',      'Pechuga de pollo cocida (sin piel)', '{pollo,pechuga,chicken breast,chicken}'::text[], 165, 31.0, 0.0, 3.6),
  ('muslo-pollo-cocido',        'Muslo de pollo cocido (sin piel)',   '{trutro,contramuslo,pollo,chicken thigh}',       209, 26.0, 0.0, 10.9),
  ('carne-molida-90-cocida',    'Carne molida de res 90 % magra, cocida', '{carne picada,picadillo,vacuno,ground beef}', 217, 26.1, 0.0, 11.7),
  ('bistec-res-magro-cocido',   'Bistec de res magro, cocido',        '{filete,lomo,solomillo,churrasco,vacuno,beef steak}', 195, 30.0, 0.0, 8.0),
  ('lomo-cerdo-cocido',         'Lomo de cerdo cocido',               '{solomillo de cerdo,chancho,puerco,pork tenderloin}', 143, 26.2, 0.0, 3.5),
  ('pechuga-pavo-cocida',       'Pechuga de pavo cocida',             '{pavo,guajolote,turkey breast}',                 147, 30.1, 0.0, 2.1),
  ('jamon-cocido',              'Jamón cocido',                       '{jamón york,jamón de pierna,ham}',               163, 16.6, 3.8, 8.6),
  ('salchicha',                 'Salchicha tipo hot dog',             '{vienesa,frankfurt,perro caliente,hot dog,frankfurter}', 290, 11.0, 4.2, 26.0),
  ('chorizo',                   'Chorizo',                            '{chorizo de cerdo,pork chorizo}',                455, 24.1, 1.9, 38.3),
  ('tocino-cocido',             'Tocino cocido',                      '{bacon,beicon,panceta,tocineta}',                541, 37.0, 1.4, 41.8),
  ('salmon-cocido',             'Salmón cocido',                      '{salmon}',                                        206, 22.1, 0.0, 12.4),
  ('atun-en-agua',              'Atún en agua, escurrido',            '{atún en lata,atun,tuna}',                        116, 25.5, 0.0, 0.8),
  ('pescado-blanco-cocido',     'Pescado blanco cocido (merluza, bacalao)', '{merluza,bacalao,reineta,tilapia,white fish,cod}', 105, 22.8, 0.0, 0.9),
  ('camarones-cocidos',         'Camarones cocidos',                  '{gambas,langostinos,shrimp,prawns}',              99, 24.0, 0.2, 0.3),
  ('huevo-entero',              'Huevo entero',                       '{huevo,blanquillo,egg}',                          143, 12.6, 0.7, 9.5),
  ('clara-huevo',               'Clara de huevo',                     '{claras,egg white}',                               52, 10.9, 0.7, 0.2),
  ('tofu-firme',                'Tofu firme',                         '{tofu}',                                          144, 17.3, 2.8, 8.7),

  -- Lácteos
  ('leche-entera',              'Leche entera',                       '{leche,whole milk,milk}',                          61, 3.2, 4.8, 3.3),
  ('leche-descremada',          'Leche descremada',                   '{leche desnatada,leche light,skim milk}',          34, 3.4, 5.0, 0.1),
  ('yogur-natural',             'Yogur natural entero',               '{yogurt,yoghurt,plain yogurt}',                    61, 3.5, 4.7, 3.3),
  ('yogur-griego-descremado',   'Yogur griego natural descremado',    '{yogurt griego,greek yogurt}',                     59, 10.2, 3.6, 0.4),
  ('queso-cheddar',             'Queso cheddar',                      '{cheddar,cheese}',                                403, 24.9, 1.3, 33.1),
  ('queso-mozzarella',          'Queso mozzarella',                   '{mozzarella,muzzarella,mozarela}',                300, 22.2, 2.2, 22.4),
  ('queso-fresco',              'Queso fresco',                       '{queso blanco,quesillo,queso de burgos,queso panela}', 299, 18.1, 3.0, 24.0),
  ('queso-parmesano',           'Queso parmesano',                    '{parmesano,parmesan}',                            392, 35.8, 3.2, 25.8),
  ('queso-cottage',             'Queso cottage',                      '{requesón,ricota,cottage cheese}',                 98, 11.1, 3.4, 4.3),
  ('mantequilla',               'Mantequilla',                        '{manteca,butter}',                                717, 0.9, 0.1, 81.1),

  -- Cereales, panes y harinas
  ('arroz-blanco-cocido',       'Arroz blanco cocido',                '{arroz,white rice,rice}',                         130, 2.7, 28.2, 0.3),
  ('arroz-integral-cocido',     'Arroz integral cocido',              '{brown rice}',                                    123, 2.7, 25.6, 1.0),
  ('avena-hojuelas',            'Avena en hojuelas (cruda)',          '{avena,copos de avena,oats,oatmeal}',             389, 16.9, 66.3, 6.9),
  ('pasta-cocida',              'Pasta cocida',                       '{fideos,tallarines,espaguetis,macarrones,spaghetti,pasta}', 158, 5.8, 30.9, 0.9),
  ('pan-molde-blanco',          'Pan de molde blanco',                '{pan lactal,pan de caja,pan bimbo,pan tajado,white bread}', 266, 7.6, 50.6, 3.3),
  ('pan-integral',              'Pan integral',                       '{pan de molde integral,whole wheat bread}',       247, 13.0, 41.3, 3.4),
  ('pan-frances',               'Pan francés / baguette',             '{marraqueta,pan batido,bolillo,barra de pan,pan de agua,baguette,french bread}', 272, 10.8, 51.9, 2.4),
  ('tortilla-maiz',             'Tortilla de maíz',                   '{tortilla,corn tortilla}',                        218, 5.7, 44.6, 2.9),
  ('tortilla-trigo',            'Tortilla de trigo',                  '{wrap,tortilla de harina,flour tortilla}',       312, 8.3, 51.6, 8.0),
  ('arepa-maiz',                'Arepa de maíz (aprox.)',             '{arepa,arepa blanca}',                            194, 4.5, 40.0, 1.6),
  ('quinoa-cocida',             'Quinoa cocida',                      '{quinua,quinoa}',                                 120, 4.4, 21.3, 1.9),
  ('cuscus-cocido',             'Cuscús cocido',                      '{couscous,cous cous}',                            112, 3.8, 23.2, 0.2),
  ('corn-flakes',               'Cereal de maíz (corn flakes)',       '{hojuelas de maíz,cereal,copos de maíz,cornflakes}', 357, 7.5, 84.1, 0.4),
  ('granola',                   'Granola',                            '{muesli,granola}',                                471, 10.0, 64.0, 20.0),
  ('harina-trigo',              'Harina de trigo',                    '{harina,flour}',                                  364, 10.3, 76.3, 1.0),
  ('galletas-saladas',          'Galletas saladas (crackers)',        '{galletas de soda,galletas de agua,saltines,crackers}', 418, 9.5, 74.0, 8.6),

  -- Legumbres
  ('porotos-negros-cocidos',    'Porotos negros cocidos',             '{frijoles negros,caraotas,habichuelas negras,judías negras,black beans}', 132, 8.9, 23.7, 0.5),
  ('porotos-rojos-cocidos',     'Porotos rojos cocidos',              '{frijoles rojos,alubias rojas,judías rojas,habichuelas,kidney beans,beans}', 127, 8.7, 22.8, 0.5),
  ('lentejas-cocidas',          'Lentejas cocidas',                   '{lentejas,lentils}',                              116, 9.0, 20.1, 0.4),
  ('garbanzos-cocidos',         'Garbanzos cocidos',                  '{garbanzos,chickpeas}',                           164, 8.9, 27.4, 2.6),
  ('arvejas-cocidas',           'Arvejas cocidas',                    '{guisantes,chícharos,petit pois,peas}',            84, 5.4, 15.6, 0.2),
  ('edamame',                   'Edamame',                            '{soja verde,frijol de soya,edamame}',             121, 11.9, 8.9, 5.2),
  ('hummus',                    'Hummus',                             '{humus,hummus}',                                  166, 7.9, 14.3, 9.6),

  -- Tubérculos y plátano macho
  ('papa-cocida',               'Papa cocida (sin piel)',             '{patata,papa,potato}',                             86, 1.7, 20.0, 0.1),
  ('papas-fritas',              'Papas fritas',                       '{patatas fritas,papas a la francesa,french fries,fries}', 312, 3.4, 41.4, 14.7),
  ('camote-cocido',             'Camote cocido',                      '{batata,boniato,sweet potato}',                    90, 2.0, 20.7, 0.2),
  ('yuca-cruda',                'Yuca (cruda)',                       '{mandioca,casabe,cassava}',                       160, 1.4, 38.1, 0.3),
  ('platano-macho-cocido',      'Plátano macho cocido',               '{plátano verde,plátano para cocinar,maduro,plantain}', 116, 0.8, 31.2, 0.2),

  -- Frutas
  ('platano',                   'Plátano',                            '{banana,banano,cambur,guineo}',                    89, 1.1, 22.8, 0.3),
  ('manzana',                   'Manzana',                            '{apple}',                                          52, 0.3, 13.8, 0.2),
  ('naranja',                   'Naranja',                            '{orange}',                                         47, 0.9, 11.8, 0.1),
  ('frutilla',                  'Frutilla',                           '{fresa,strawberry}',                               32, 0.7, 7.7, 0.3),
  ('uvas',                      'Uvas',                               '{uva,grapes}',                                     69, 0.7, 18.1, 0.2),
  ('pina',                      'Piña',                               '{ananá,ananas,pineapple}',                         50, 0.5, 13.1, 0.1),
  ('mango',                     'Mango',                              '{mango}',                                          60, 0.8, 15.0, 0.4),
  ('sandia',                    'Sandía',                             '{patilla,watermelon}',                             30, 0.6, 7.6, 0.2),
  ('papaya',                    'Papaya',                             '{lechosa,fruta bomba,papaya}',                     43, 0.5, 10.8, 0.3),
  ('pera',                      'Pera',                               '{pear}',                                           57, 0.4, 15.2, 0.1),
  ('arandanos',                 'Arándanos',                          '{blueberries}',                                    57, 0.7, 14.5, 0.3),
  ('kiwi',                      'Kiwi',                               '{kiwi}',                                           61, 1.1, 14.7, 0.5),
  ('palta',                     'Palta',                              '{aguacate,avocado}',                              160, 2.0, 8.5, 14.7),

  -- Verduras
  ('tomate',                    'Tomate',                             '{jitomate,tomato}',                                18, 0.9, 3.9, 0.2),
  ('lechuga',                   'Lechuga',                            '{lettuce}',                                        15, 1.4, 2.9, 0.2),
  ('brocoli-cocido',            'Brócoli cocido',                     '{brécol,brocoli,broccoli}',                        35, 2.4, 7.2, 0.4),
  ('zanahoria',                 'Zanahoria',                          '{carrot}',                                         41, 0.9, 9.6, 0.2),
  ('cebolla',                   'Cebolla',                            '{onion}',                                          40, 1.1, 9.3, 0.1),
  ('pepino',                    'Pepino',                             '{cucumber}',                                       15, 0.7, 3.6, 0.1),
  ('espinaca',                  'Espinaca',                           '{espinacas,spinach}',                              23, 2.9, 3.6, 0.4),
  ('choclo-cocido',             'Choclo cocido',                      '{maíz dulce,elote,mazorca,jojoto,sweet corn,corn}', 96, 3.4, 21.0, 1.5),
  ('zapallo',                   'Zapallo',                            '{calabaza,auyama,ahuyama,pumpkin,squash}',         26, 1.0, 6.5, 0.1),
  ('pimiento-rojo',             'Pimiento rojo',                      '{morrón,pimentón,ají dulce,chile morrón,bell pepper}', 31, 1.0, 6.0, 0.3),
  ('champinones',               'Champiñones',                        '{hongos,setas,mushrooms}',                         22, 3.1, 3.3, 0.3),
  ('zucchini',                  'Zucchini',                           '{calabacín,calabacita,zapallito italiano,courgette,zucchini}', 17, 1.2, 3.1, 0.3),

  -- Grasas, frutos secos y salsas
  ('aceite-oliva',              'Aceite de oliva',                    '{olive oil}',                                     884, 0.0, 0.0, 100.0),
  ('aceite-vegetal',            'Aceite vegetal',                     '{aceite de girasol,aceite de canola,vegetable oil}', 884, 0.0, 0.0, 100.0),
  ('mantequilla-mani',          'Mantequilla de maní',                '{crema de cacahuate,crema de cacahuete,peanut butter}', 588, 25.1, 20.0, 50.4),
  ('almendras',                 'Almendras',                          '{almonds}',                                       579, 21.2, 21.6, 49.9),
  ('mani',                      'Maní',                               '{cacahuate,cacahuete,peanuts}',                   567, 25.8, 16.1, 49.2),
  ('nueces',                    'Nueces',                             '{nuez,walnuts}',                                  654, 15.2, 13.7, 65.2),
  ('mayonesa',                  'Mayonesa',                           '{mayo,mayonnaise}',                               680, 1.0, 0.6, 75.0),

  -- Dulces, bebidas y otros
  ('azucar',                    'Azúcar',                             '{azúcar blanca,sugar}',                           387, 0.0, 100.0, 0.0),
  ('miel',                      'Miel',                               '{miel de abeja,honey}',                           304, 0.3, 82.4, 0.0),
  ('chocolate-amargo',          'Chocolate amargo 70-85 %',           '{chocolate negro,chocolate oscuro,dark chocolate}', 598, 7.8, 45.9, 42.6),
  ('proteina-whey',             'Proteína whey en polvo (aprox.)',    '{proteína de suero,whey,whey protein,protein powder}', 389, 78.0, 8.0, 5.0),
  ('bebida-cola',               'Bebida cola',                        '{gaseosa,refresco,soda,coca cola,cola}',           42, 0.0, 10.6, 0.0),
  ('jugo-naranja',              'Jugo de naranja',                    '{zumo de naranja,orange juice}',                   45, 0.7, 10.4, 0.2),
  ('cafe-negro',                'Café negro',                         '{café,tinto,coffee}',                               1, 0.1, 0.0, 0.0),
  ('cerveza',                   'Cerveza',                            '{chela,birra,beer}',                               43, 0.5, 3.6, 0.0),
  ('vino-tinto',                'Vino tinto',                         '{vino,red wine,wine}',                             85, 0.1, 2.6, 0.0),

  -- Preparaciones típicas (aprox.)
  ('pizza-queso',               'Pizza de queso',                     '{pizza,cheese pizza}',                            266, 11.4, 33.3, 9.7),
  ('tortilla-espanola',         'Tortilla española (aprox.)',         '{tortilla de patatas,tortilla de papas,spanish omelette}', 153, 6.0, 12.0, 9.0),
  ('empanada-carne-horno',      'Empanada de carne al horno (aprox.)', '{empanada,empanada de pino,beef empanada}',      287, 10.0, 28.0, 15.0)
) as v(slug, name, aliases, kcal, protein, carbs, fat)
on conflict (slug) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  kcal_100g = excluded.kcal_100g,
  protein_100g = excluded.protein_100g,
  carbs_100g = excluded.carbs_100g,
  fat_100g = excluded.fat_100g;

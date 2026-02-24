-- ============================================
-- CLEANUP: Delete 4 test/placeholder records
-- ============================================
DELETE FROM businesses WHERE id IN (73, 74, 75, 76);

-- ============================================
-- POPULATE: Addresses for all 34 real businesses
-- ============================================
UPDATE businesses SET address = CASE id
  WHEN 36 THEN 'Rue du Commerce, Immeuble CCIA, 3ème étage, Plateau'
  WHEN 37 THEN 'Boulevard de Marseille, Zone Industrielle, Marcory'
  WHEN 38 THEN 'Rue des Jardins, Zone Industrielle, Yopougon'
  WHEN 39 THEN 'Avenue Lamblin, Immeuble Alpha 2000, Plateau'
  WHEN 40 THEN 'Boulevard des Martyrs, Résidence Nabil, Cocody'
  WHEN 41 THEN 'Avenue de la Paix, Quartier Habitat, Yamoussoukro'
  WHEN 42 THEN 'Rue Gourgas, Immeuble Woodin Center, Plateau'
  WHEN 43 THEN 'Avenue Terrasson de Fougères, Plateau'
  WHEN 44 THEN 'Boulevard de France, Riviera 3, Cocody'
  WHEN 45 THEN 'Avenue 21, Rue 38, Treichville'
  WHEN 46 THEN 'Port de Pêche, Rue Principale, Port-Bouet'
  WHEN 47 THEN 'Rue Pierre et Marie Curie, Zone 4C, Marcory'
  WHEN 48 THEN 'Boulevard du Général de Gaulle, Yopougon Attié'
  WHEN 49 THEN 'Rue des Jardins, Riviera Bonoumin, Cocody'
  WHEN 50 THEN 'Avenue Chardy, Immeuble Le Mans, Plateau'
  WHEN 51 THEN 'Boulevard VGE, Zone Industrielle, Marcory'
  WHEN 52 THEN 'Rue du Commerce, Immeuble Trade Center, Plateau'
  WHEN 53 THEN 'Boulevard Latrille, Riviera 2, Cocody'
  WHEN 54 THEN 'Avenue 7, Rue 12, Treichville, Plateau'
  WHEN 55 THEN 'Boulevard Latrille, Angré 8ème Tranche, Cocody'
  WHEN 56 THEN 'Avenue Botreau Roussel, Immeuble Postel, Plateau'
  WHEN 57 THEN 'Rue Lecoeur, Immeuble SIPIM, Plateau'
  WHEN 58 THEN 'Route Nationale A3, Zone Industrielle, Yamoussoukro'
  WHEN 59 THEN 'Quartier Commerce, Avenue Houphouët-Boigny, Bouaké'
  WHEN 60 THEN 'Boulevard Angoulvant, Immeuble Crosson-Duplessis, Plateau'
  WHEN 61 THEN 'Rue J17, Cité des Arts, Cocody'
  WHEN 62 THEN 'Avenue Lamblin, Immeuble CGECI, Plateau'
  WHEN 63 THEN 'Rue Jesse Owens, Immeuble OECA, Plateau'
  WHEN 64 THEN 'Boulevard Latrille, Riviera Palmeraie, Cocody'
  WHEN 65 THEN 'Rue des Jardins, 2 Plateaux Vallons, Plateau'
  WHEN 66 THEN 'Avenue Noguès, Immeuble Harmony, Plateau'
  WHEN 67 THEN 'Boulevard Principal, Quartier Sicogi, Yopougon'
  WHEN 68 THEN 'Rue J52, Riviera Golf, Cocody'
  WHEN 69 THEN 'Boulevard du Port, Zone Portuaire, Port-Bouet'
  ELSE address
END
WHERE id BETWEEN 36 AND 69;

-- ============================================
-- POPULATE: GPS coordinates (lat/lng)
-- ============================================
UPDATE businesses SET 
  latitude = CASE id
    -- Plateau (Abidjan CBD) ~5.3220, -4.0166
    WHEN 36 THEN 5.3225  WHEN 39 THEN 5.3218  WHEN 42 THEN 5.3232
    WHEN 43 THEN 5.3210  WHEN 50 THEN 5.3240  WHEN 52 THEN 5.3215
    WHEN 54 THEN 5.3228  WHEN 56 THEN 5.3208  WHEN 57 THEN 5.3235
    WHEN 60 THEN 5.3222  WHEN 62 THEN 5.3206  WHEN 63 THEN 5.3245
    WHEN 65 THEN 5.3412  WHEN 66 THEN 5.3230
    -- Cocody ~5.3480, -3.9890
    WHEN 40 THEN 5.3485  WHEN 44 THEN 5.3520  WHEN 49 THEN 5.3510
    WHEN 53 THEN 5.3490  WHEN 55 THEN 5.3475  WHEN 61 THEN 5.3502
    WHEN 64 THEN 5.3462  WHEN 68 THEN 5.3530
    -- Marcory ~5.3050, -3.9930
    WHEN 37 THEN 5.3060  WHEN 47 THEN 5.3045  WHEN 51 THEN 5.3072
    -- Yopougon ~5.3390, -4.0650
    WHEN 38 THEN 5.3395  WHEN 48 THEN 5.3410  WHEN 67 THEN 5.3380
    -- Port-Bouet ~5.2560, -3.9260
    WHEN 46 THEN 5.2565  WHEN 69 THEN 5.2580
    -- Treichville ~5.2980, -3.9980
    WHEN 45 THEN 5.2985
    -- Yamoussoukro ~6.8270, -5.2760
    WHEN 41 THEN 6.8275  WHEN 58 THEN 6.8310
    -- Bouaké ~7.6939, -5.0308
    WHEN 59 THEN 7.6942
    ELSE latitude
  END,
  longitude = CASE id
    -- Plateau
    WHEN 36 THEN -4.0168  WHEN 39 THEN -4.0172  WHEN 42 THEN -4.0155
    WHEN 43 THEN -4.0180  WHEN 50 THEN -4.0163  WHEN 52 THEN -4.0175
    WHEN 54 THEN -4.0160  WHEN 56 THEN -4.0185  WHEN 57 THEN -4.0152
    WHEN 60 THEN -4.0170  WHEN 62 THEN -4.0178  WHEN 63 THEN -4.0148
    WHEN 65 THEN -4.0082  WHEN 66 THEN -4.0165
    -- Cocody
    WHEN 40 THEN -3.9892  WHEN 44 THEN -3.9865  WHEN 49 THEN -3.9878
    WHEN 53 THEN -3.9895  WHEN 55 THEN -3.9855  WHEN 61 THEN -3.9908
    WHEN 64 THEN -3.9840  WHEN 68 THEN -3.9870
    -- Marcory
    WHEN 37 THEN -3.9935  WHEN 47 THEN -3.9928  WHEN 51 THEN -3.9942
    -- Yopougon
    WHEN 38 THEN -4.0655  WHEN 48 THEN -4.0640  WHEN 67 THEN -4.0668
    -- Port-Bouet
    WHEN 46 THEN -3.9265  WHEN 69 THEN -3.9250
    -- Treichville
    WHEN 45 THEN -3.9982
    -- Yamoussoukro
    WHEN 41 THEN -5.2762  WHEN 58 THEN -5.2745
    -- Bouaké
    WHEN 59 THEN -5.0312
    ELSE longitude
  END
WHERE id BETWEEN 36 AND 69;

-- ============================================
-- POPULATE: Tags based on each business category
-- ============================================
UPDATE businesses SET tags = CASE id
  WHEN 36 THEN '["publicité","branding","marketing digital","design graphique","communication"]'::jsonb
  WHEN 37 THEN '["impression offset","reliure","packaging","flyers","cartes de visite"]'::jsonb
  WHEN 38 THEN '["cloud computing","hébergement web","serveurs dédiés","sauvegarde","SaaS"]'::jsonb
  WHEN 39 THEN '["data center","colocation","fibre optique","sécurité réseau","uptime 99.9%"]'::jsonb
  WHEN 40 THEN '["immobilier","vente","location","appartements","villas","terrains"]'::jsonb
  WHEN 41 THEN '["promotion immobilière","construction","lotissement","résidentiel","commercial"]'::jsonb
  WHEN 42 THEN '["audit financier","conseil fiscal","due diligence","conformité","OHADA"]'::jsonb
  WHEN 43 THEN '["comptabilité","bilan","déclaration fiscale","paie","expertise comptable"]'::jsonb
  WHEN 44 THEN '["cardiologie","chirurgie cardiaque","échocardiographie","consultation","urgences"]'::jsonb
  WHEN 45 THEN '["urgences","chirurgie","maternité","pédiatrie","radiologie","laboratoire"]'::jsonb
  WHEN 46 THEN '["poisson frais","fruits de mer","thon","crevettes","livraison"]'::jsonb
  WHEN 47 THEN '["traiteur événementiel","buffet","cocktail","mariage","séminaire"]'::jsonb
  WHEN 48 THEN '["médicaments vétérinaires","vaccins animaux","antiparasitaires","nutrition animale"]'::jsonb
  WHEN 49 THEN '["consultation vétérinaire","vaccination","chirurgie animale","toilettage","urgences"]'::jsonb
  WHEN 50 THEN '["plomberie","dépannage","installation sanitaire","chauffe-eau","canalisation"]'::jsonb
  WHEN 51 THEN '["vitrerie","miroiterie","double vitrage","pare-brise","décoration verre"]'::jsonb
  WHEN 52 THEN '["meubles","décoration intérieure","canapés","literie","bureau","livraison"]'::jsonb
  WHEN 53 THEN '["art contemporain","exposition","peinture","sculpture","artistes africains"]'::jsonb
  WHEN 54 THEN '["tissus wax","bazin","soie","coton","mercerie","couture"]'::jsonb
  WHEN 55 THEN '["prêt-à-porter","mode africaine","accessoires","sacs","chaussures"]'::jsonb
  WHEN 56 THEN '["téléphonie mobile","internet","fibre optique","4G/5G","forfaits"]'::jsonb
  WHEN 57 THEN '["VoIP","téléphonie IP","visioconférence","standard téléphonique","SIP"]'::jsonb
  WHEN 58 THEN '["abattoir","viande bovine","découpe","export","certification sanitaire"]'::jsonb
  WHEN 59 THEN '["engrais","pesticides","semences","agriculture","conseil agronomique"]'::jsonb
  WHEN 60 THEN '["services consulaires","visa","légalisation","passeport","coopération"]'::jsonb
  WHEN 61 THEN '["société civile","droits humains","développement","plaidoyer","communautaire"]'::jsonb
  WHEN 62 THEN '["patronat","dialogue social","lobbying","formation","réseau professionnel"]'::jsonb
  WHEN 63 THEN '["ordre professionnel","déontologie","agrément","formation continue","réglementation"]'::jsonb
  WHEN 64 THEN '["soins visage","manucure","coiffure","maquillage","épilation","massage"]'::jsonb
  WHEN 65 THEN '["spa","massage","sauna","hammam","soins corporels","relaxation"]'::jsonb
  WHEN 66 THEN '["recrutement","intérim","placement","RH","conseil emploi","CV"]'::jsonb
  WHEN 67 THEN '["formation professionnelle","certification","apprentissage","BTS","stage"]'::jsonb
  WHEN 68 THEN '["lieu de culte","interreligieux","méditation","cérémonie","spiritualité"]'::jsonb
  WHEN 69 THEN '["moteurs marins","pièces détachées","entretien bateau","hors-bord","diesel marin"]'::jsonb
  ELSE tags
END
WHERE id BETWEEN 36 AND 69;

-- Also set city_name & country_code for completeness
UPDATE businesses SET 
  city_name = CASE 
    WHEN location = 'Plateau' THEN 'Abidjan'
    WHEN location = 'Cocody' THEN 'Abidjan'
    WHEN location = 'Marcory' THEN 'Abidjan'
    WHEN location = 'Yopougon' THEN 'Abidjan'
    WHEN location = 'Port-Bouet' THEN 'Abidjan'
    WHEN location = 'Treichville' THEN 'Abidjan'
    WHEN location = 'Yamoussoukro' THEN 'Yamoussoukro'
    WHEN location = 'Bouaké' THEN 'Bouaké'
    ELSE city_name
  END,
  country_code = 'CI'
WHERE id BETWEEN 36 AND 69;

# Supported Tuya Zigbee devices

Tuya Zigbee hardware is frequently sold under different retail brands and model names. Compatibility in this app is therefore based primarily on the Zigbee identity exposed by the device, especially `manufacturerName` and `productId`.

This document preserves the community-maintained compatibility list that previously lived in the main README because many users rely on these IDs when deciding which devices to buy.

> The driver manifests under `drivers/*/driver.compose.json` are the authoritative source used by Homey for pairing. This document is a human-readable reference and can occasionally lag behind the manifests.

<!-- BEGIN GENERATED DEVICE INDEX -->
## Manifest identity index

This section is generated from the Homey manifest. It is the easiest place to check the Zigbee identities currently matched by the app. Retail brands and model names are intentionally not inferred: Tuya hardware is frequently rebranded and visually identical products can expose different Zigbee identities.

| Driver | Product ID(s) | Manufacturer name(s) |
| --- | --- | --- |
| 1 button Smart Remote Controller (`smart_remote_1_button`) | `TS004F` | `_TZ3000_kjfzuycl`<br>`_TZ3000_rco1yzb1`<br>`_TZ3000_yirp2pgd` |
| 1 button Smart Remote Controller (`smart_remote_1_button_2`) | `TS004F` | `_TZ3000_ja5osu5g` |
| 1 Channel Relay Board (`relay_board_1_channel`) | `TS0001` | `_TZ3000_g8n1n7lg` |
| 1 Gang Dimmer Module (`dimmer_1_gang`) | `TS0052`<br>`TS110E`<br>`TS110F` | `_TYZB01_qezuin6k`<br>`_TZ3000_ktuoyvt5`<br>`_TZ3000_mgusv51k`<br>`_TZ3210_k1msuvg6`<br>`_TZ3210_ngqk6jia`<br>`_TZ3210_weaqkhab`<br>`_TZ3210_zxbtub8r` |
| 1 Gang Dimmer Module (`dimmer_1_gang_2`) | `TS110E` | `_TZ3210_ngqk6jia` |
| 1 Gang Dimmer Module (`dimmer_1_gang_tuya`) | `TS0601` | `_TZE200_1agwnems`<br>`_TZE200_4mh6tyyo`<br>`_TZE200_579lguh2`<br>`_TZE200_ip2akl4w`<br>`_TZE200_la2c2uo9`<br>`_TZE200_vucankjx`<br>`_TZE204_9qhuzgo0`<br>`_TZE204_dcnsggvz`<br>`_TZE204_hlx9tnzb`<br>`_TZE204_n9ctkb6j` |
| 1 Gang Dimmer Module (AVATTO) (`dimmer_1_gang_tuya_avatto`) | `TS0601` | `_TZE204_5cuocqty` |
| 1 Gang Switch Module (`switch_1_gang`) | `TS0001`<br>`TS0003`<br>`TS000F`<br>`TS0011`<br>`TS011F` | `_TYZB01_aneiicmq`<br>`_TYZB01_ncutbjdi`<br>`_TZ3000_46t1rvdu`<br>`_TZ3000_6axxqqi2`<br>`_TZ3000_ji4araar`<br>`_TZ3000_m9af2l6g`<br>`_TZ3000_majwnphg`<br>`_TZ3000_mx3vgyea`<br>`_TZ3000_npzfdcof`<br>`_TZ3000_pmvbt5hh`<br>`_TZ3000_qmi1cfuq`<br>`_TZ3000_rmjr4ufz`<br>`_TZ3000_sjpl9eg3`<br>`_TZ3000_tqlv4ug4`<br>`_TZ3000_zmy1waw6` |
| 1 Gang Switch Module with metering (`switch_1_gang_metering`) | `TS0001` | `_TZ3000_prits6g4` |
| 1 Gang Switch Module with metering (`switch_1_gang_metering_gjrubzje`) | `TS0001` | `_TZ3000_gjrubzje` |
| 1 Gang Wall Remote (`wall_remote_1_gang`) | `TS0041` | `_TYZB02_keyjqthh`<br>`_TZ3000_4upl1fcj`<br>`_TZ3000_8rppvwda`<br>`_TZ3000_axpdxqgu`<br>`_TZ3000_f97vq5mn`<br>`_TZ3000_fkp5zyho`<br>`_TZ3000_itb0omhv`<br>`_TZ3000_peszejy7`<br>`_TZ3000_pzui3skt`<br>`_TZ3000_q68478x7`<br>`_TZ3000_tk3s5tyg` |
| 1 Gang Wall Switch (`wall_switch_1_gang`) | `TS0001`<br>`TS0011` | `_TYZB01_qeqvmvti`<br>`_TYZB01_seqwasot`<br>`_TYZB01_xfpdrwvc`<br>`_TZ3000_3u4hripk`<br>`_TZ3000_3wkqni6o`<br>`_TZ3000_6eyydfyg`<br>`_TZ3000_7jx5ypra`<br>`_TZ3000_9hpxg80k`<br>`_TZ3000_f8tmviy0`<br>`_TZ3000_gidy6sjs`<br>`_TZ3000_hafsqare`<br>`_TZ3000_hhiodade`<br>`_TZ3000_hktqahrq`<br>`_TZ3000_oaq83gqc`<br>`_TZ3000_oex7egmt`<br>`_TZ3000_raytv4q5`<br>`_TZ3000_yl3zuyaw`<br>`_TZ3000_ysdv91bk` |
| 1 Gang Wall Switch (`wall_switch_1_gang_tuya`) | `TS0601` | `_TZE200_amp6tsvy`<br>`_TZE200_gbagoilo` |
| 2 Channel Relay Board (`relay_board_2_channel`) | `TS0002` | `_TZ3000_nuenzetq`<br>`_TZ3000_ruldv5dt` |
| 2 Gang Curtain Module (`curtain_module_2_gang`) | `TS130F` | `_TZ3000_j1xl73iw`<br>`_TZ3000_l6iqph4f` |
| 2 Gang Dimmer Module (`dimmer_2_gang`) | `TS1101`<br>`TS110E`<br>`TS110F` | `_TYZB01_v8gtiaed`<br>`_TZ3000_7ysdnebc`<br>`_TZ3000_92chsky7`<br>`_TZ3210_3mpwqzuu`<br>`_TZ3210_4ubylghk`<br>`_TZ3210_pagajpog`<br>`_TZ3210_wdexaypg` |
| 2 Gang Dimmer Module (`dimmer_2_gang_tuya`) | `TS0601` | `_TZE200_e3oitdyu`<br>`_TZE200_gwkapsoq`<br>`_TZE204_bxoo2swd`<br>`_TZE204_zenj4lxv` |
| 2 Gang Dimmer Module (MOES) (`dimmer_2_gang_tuya_fjjbhx9d`) | `TS0601` | `_TZE200_fjjbhx9d` |
| 2 Gang Switch Module (`switch_2_gang`) | `TS0002`<br>`TS0003`<br>`TS0012`<br>`TS0013`<br>`TS011F`<br>`ZG-305Z` | `HOBEIAN`<br>`_TYZB01_digziiav`<br>`_TYZB01_zsl6z0pw`<br>`_TZ3000_4js9lo5d`<br>`_TZ3000_7ed9cqgi`<br>`_TZ3000_bvrlqyj7`<br>`_TZ3000_fisb3ajo`<br>`_TZ3000_jcfje0kb`<br>`_TZ3000_jl7qyupf`<br>`_TZ3000_llfaquvp`<br>`_TZ3000_lmlsduws`<br>`_TZ3000_pmz6mjyu`<br>`_TZ3000_qaa59zqd`<br>`_TZ3000_qcgw8qfa`<br>`_TZ3000_ruxexjfz` |
| 2 Gang Switch Module with metering (`switch_2_gang_metering`) | `TS0002`<br>`TS011F` | `_TZ3000_zmy4lslw` |
| 2 Gang Wall Remote (`wall_remote_2_gang`) | `TS0042` | `_TYZB02_keyjhapk`<br>`_TZ3000_5e235jpa`<br>`_TZ3000_dfgbtub0`<br>`_TZ3000_fkvaniuu`<br>`_TZ3000_h1c2eamp`<br>`_TZ3000_oikiyf3b`<br>`_TZ3000_owgcnkrh`<br>`_TZ3000_tzvbimpq`<br>`_TZ3400_keyjhapk` |
| 2 Gang Wall Switch (`wall_switch_2_gang`) | `TS0002`<br>`TS0012`<br>`TS0042` | `TUYATEC-O6SNCwd6`<br>`TUYATEC-nzrrvgco`<br>`_TYZB01_2athzhfr`<br>`_TYZB01_6g8b7at8`<br>`_TYZB01_6sadkhcy`<br>`_TYZB01_mtlhqn48`<br>`_TYZB01_vzrytttn`<br>`_TZ3000_18ejxno0`<br>`_TZ3000_56bdyj21`<br>`_TZ3000_5vujyute`<br>`_TZ3000_atp7xmd9`<br>`_TZ3000_e98krvvk`<br>`_TZ3000_fvh3pjaz`<br>`_TZ3000_lupfd8zu`<br>`_TZ3000_mklgayek`<br>`_TZ3000_mrqea2uu`<br>`_TZ3000_nta0gb8h`<br>`_TZ3000_p8alo7qa`<br>`_TZ3000_qn8qvk9y`<br>`_TZ3000_s8r1qoyq`<br>`_TZ3000_svoqrno4`<br>`_TZ3000_xftvfolu`<br>`_TZ3000_yhagrqmd` |
| 2 Gang Wall Switch (`wall_switch_2_gang_tuya`) | `TS0601` | `_TZE200_g1ib5ldv` |
| 3 Gang Switch Module (`switch_3_gang`) | `TS0003` | `_TZ3000_4o16jdca`<br>`_TZ3000_empogkya`<br>`_TZ3000_lvhy15ix`<br>`_TZ3000_odzoiovu` |
| 3 Gang Wall Remote (`wall_remote_3_gang`) | `TS0043` | `_TYZB02_key8kk7r`<br>`_TZ3000_a7ouggvs`<br>`_TZ3000_bczr4e10`<br>`_TZ3000_bi6lpsew`<br>`_TZ3000_famkxci2`<br>`_TZ3000_gbm10jnj`<br>`_TZ3000_qzjcsmar`<br>`_TZ3000_rrjr1q0u`<br>`_TZ3000_sj7jbgks`<br>`_TZ3000_w4thianr`<br>`_TZ3000_w8jwkczz`<br>`_TZ3000_yw5tvzsk` |
| 3 Gang Wall Switch (`wall_switch_3_gang`) | `TS0003`<br>`TS0013`<br>`TS0043` | `_TYZB01_b8cr31hp`<br>`_TYZB01_mqel1whf`<br>`_TYZB01_xiuox57i`<br>`_TZ3000_2dlwlvex`<br>`_TZ3000_5e5ptb24`<br>`_TZ3000_aezbqpcu`<br>`_TZ3000_cdamjqm9`<br>`_TZ3000_hlwm8e96`<br>`_TZ3000_kl72oake`<br>`_TZ3000_lrgccsxm`<br>`_TZ3000_qcdqw8nf`<br>`_TZ3000_qewo8dlz`<br>`_TZ3000_thhxrept`<br>`_TZ3000_vvlivusi`<br>`_TZ3000_w05exif3`<br>`_TZ3000_wyhuocal` |
| 3 Socket Power Strip (`socket_power_strip`) | `TS011F` | `_TZ3000_1obwwnmq`<br>`_TZ3000_4uf3d0ax`<br>`_TZ3000_vmpbygs5`<br>`_TZ3000_vzopcetz`<br>`_TZ3000_wzauvbcs` |
| 4 Button Remote (`handheld_remote_4_buttons`) | `TS0044` | `_TZ3000_mh9px7cq`<br>`_TZ3000_u3nv1jwk` |
| 4 button Smart Remote Controller (`smart_remote_4_buttons`) | `TS0215A` | `_TYZB01_qm6djpta`<br>`_TZ3000_eo3dttwe`<br>`_TZ3000_fsiepnrh`<br>`_TZ3000_p6ju8myv` |
| 4 Channel Relay Board (`relay_board_4_channel`) | `TS0004` | `_TZ3000_a37eix1s`<br>`_TZ3000_excgg5kb`<br>`_TZ3000_hdlpifbk`<br>`_TZ3000_imaccztn`<br>`_TZ3000_u3oupgdy`<br>`_TZ3000_wkr3jqmr` |
| 4 Gang Switch Module with metering (`switch_4_gang_metering`) | `TS0004` | `_TZ3000_mmkbptmx` |
| 4 Gang Wall Remote (`wall_remote_4_gang`) | `TS0044` | `_TZ3000_a4xycprs`<br>`_TZ3000_ee8nrt2l`<br>`_TZ3000_ufhtxr59`<br>`_TZ3000_vp6clf9d` |
| 4 Gang Wall Remote (`wall_remote_4_gang_2`) | `TS004F` | `_TZ3000_0ht8dnxj`<br>`_TZ3000_11pg3ima`<br>`_TZ3000_b3mgfu0d`<br>`_TZ3000_czuyt8lz`<br>`_TZ3000_et7afzxz`<br>`_TZ3000_nuombroo`<br>`_TZ3000_xabckq1v` |
| 4 Gang Wall Remote (`wall_remote_4_gang_3`) | `TS0044` | `_TZ3000_jcspr0tp`<br>`_TZ3000_kfu8zapd`<br>`_TZ3000_uaa99arv`<br>`_TZ3000_wkai4ga5`<br>`_TZ3000_zgyzgdua` |
| 4 Gang Wall Switch (`wall_switch_4_gang_tuya`) | `TS0601` | `_TZE200_aqnazj70`<br>`_TZE200_di3tfv5b`<br>`_TZE200_mexisfik`<br>`_TZE200_shkxsgis`<br>`_TZE204_6wi2mope`<br>`_TZE204_aagrxlbd`<br>`_TZE204_iik0pquw` |
| 5 Gang Wall Switch (`wall_switch_5_gang_tuya`) | `TS0601` | `_TZE200_jwsjbxjs` |
| 6 Gang Wall Remote (`wall_remote_6_gang`) | `TS0046` | `_TZ3000_iszegwpd` |
| 6 Gang Wall Switch (`wall_switch_6_gang_tuya`) | `TS0601` | `_TZE200_9mahtqtg`<br>`_TZE200_r731zlxk` |
| Aubess Standard Zigbee Temperature & Humidity (`temphumidsensor_aubess_qoy0ekbd`) | `TS0601` | `_TZE200_qoy0ekbd` |
| BSEED TS0001 Single-Channel Wall Switch (`switch_1_gang_bseed_ts0001`) | `TS0001` | `_TZ3000_blhvsaqf` |
| BSEED TS0726 Four-Channel Wall Switch (`switch_4_gang_bseed_ts0726`) | `TS0726` | `_TZ3002_pzao9ls1` |
| Christmas Lights (`christmas_lights`) | `TS0601` | `_TZE200_s8gkrkxk` |
| Curtain Module (`curtain_module`) | `TS130F` | `_TZ3000_1dd0d5yi`<br>`_TZ3000_4uuaja4a`<br>`_TZ3000_e3vhyirx`<br>`_TZ3000_eafaa66e`<br>`_TZ3000_eg7awg6a`<br>`_TZ3000_fccpjz5z`<br>`_TZ3000_femsaaua`<br>`_TZ3000_jwv3cwak`<br>`_TZ3000_ke7pzj5d`<br>`_TZ3000_vd43bbfq`<br>`_TZ3000_zirycpws`<br>`_TZ3210_dwytrmda`<br>`_TZ3210_ol1uhvza` |
| Curtain Motor (`curtain_motor`) | `TS0601` | `_TZE200_3i3exuay`<br>`_TZE200_4vobcgd3`<br>`_TZE200_5zbp6j0u`<br>`_TZE200_68nvbio9`<br>`_TZE200_9p5xmj5r`<br>`_TZE200_axgvo9jh`<br>`_TZE200_bjzrowv2`<br>`_TZE200_cf1sl3tj`<br>`_TZE200_cowvfni3`<br>`_TZE200_fdtjuw7u`<br>`_TZE200_gaj531w3`<br>`_TZE200_hsgrhjpf`<br>`_TZE200_nkoabg8w`<br>`_TZE200_nogaemzt`<br>`_TZE200_nueqqe6k`<br>`_TZE200_nw1r9hp6`<br>`_TZE200_pk0sfzvr`<br>`_TZE200_pw7mji0l`<br>`_TZE200_r0jdjrvi`<br>`_TZE200_rddyvrci`<br>`_TZE200_rmymn92d`<br>`_TZE200_uj3f4wr5`<br>`_TZE200_wmcdj3aq`<br>`_TZE200_xaabybja`<br>`_TZE200_xuzcvlku`<br>`_TZE200_yia0p3tr`<br>`_TZE200_zah67ekd`<br>`_TZE200_zpzndjez`<br>`_TZE204_1fuxihti`<br>`_TZE204_xu4a5rhj` |
| Dimmable LED Strip (`dimmable_led_strip`) | `TS0502B` | `_TZ3210_invesber` |
| Dimmable Recessed LED (`dimmable_recessed_led`) | `TS0502B` | `_TZ3210_zdrhqmo0` |
| Door & Window Sensor (`doorwindowsensor`) | `RH3001`<br>`SNZB-04`<br>`TS0203` | `TUYATEC-7qunn4gq`<br>`TUYATEC-Bfq2i2Sy`<br>`TUYATEC-abkehqus`<br>`TUYATEC-crr8qb0p`<br>`TUYATEC-g3gl6cgy`<br>`TUYATEC-ip9ganvw`<br>`TUYATEC-kbqf60nt`<br>`TUYATEC-r9hgssol`<br>`TUYATEC-rkqiqvcs`<br>`TUYATEC-sb6t7ett`<br>`TUYATEC-trhrga6p`<br>`Wing`<br>`_TYZB01_xph99wvr`<br>`_TZ3000_1bwpjvlz`<br>`_TZ3000_26fmupbb`<br>`_TZ3000_2mbfxlzr`<br>`_TZ3000_402jjyro`<br>`_TZ3000_4ugnzsli`<br>`_TZ3000_6jeesvrt`<br>`_TZ3000_6zvw8ham`<br>`_TZ3000_7d8yme6f`<br>`_TZ3000_996rpfy6`<br>`_TZ3000_9eeavbk5`<br>`_TZ3000_a33rw7ou`<br>`_TZ3000_au1rjicn`<br>`_TZ3000_au2o5e6q`<br>`_TZ3000_bmg14ax2`<br>`_TZ3000_bzxloft`<br>`_TZ3000_bzxlofth`<br>`_TZ3000_c8zfad4a`<br>`_TZ3000_cea5xugq`<br>`_TZ3000_decxrtwa`<br>`_TZ3000_ebar6ljy`<br>`_TZ3000_gntwytxo`<br>`_TZ3000_n2egfsli`<br>`_TZ3000_oxslv1c9`<br>`_TZ3000_qrldbmfn`<br>`_TZ3000_rgchmad8`<br>`_TZ3000_v7chgqso`<br>`_TZ3000_wut53hfm`<br>`_TZ3000_yfekcy3n`<br>`_TZ3000_yxqnffam` |
| Door & Window Sensor (`doorwindowsensor_2`) | `DoorWindow-Sensor-ZB3.0`<br>`MCT-340 E`<br>`RH3001`<br>`TS0203` | `Immax`<br>`TUYATEC-0l6xaqmi`<br>`Visonic`<br>`_TZ3000_7tbsruql`<br>`_TZ3000_8yhypbo7`<br>`_TZ3000_cqlnswn0`<br>`_TZ3000_hkcpblrs`<br>`_TZ3000_osu834un` |
| Door & Window Sensor (`doorwindowsensor_3`) | `TS0203` | `_TZ3000_0hkmcrza`<br>`_TZ3000_bpkijo14`<br>`_TZ3000_uvti8nkd`<br>`_TZ3000_zgrffiwg`<br>`_TZ3000_zutizvyk` |
| Door & Window Sensor (`doorwindowsensor_4`) | `DS01` | `zbeacon` |
| Doorbell Button (`doorbell_button`) | `TS0211` | `_TZ1800_ladpngdx` |
| Dooya Curtain/Roller Motor (RJ11 Zigbee) (`curtain_motor_dooya`) | `TS0601` | `_TZE200_3ylew7b4` |
| Double Power Point (`double_power_point_2`) | `TS011F` | `_TYZB01_hlla45kx`<br>`_TZ3000_k6fvknrr` |
| Double Power Point - With Metering (`double_power_point`) | `TS011F` | `_TZ3000_dd8wwzcy`<br>`_TZ3210_7jnk7l3k`<br>`_TZ3210_pfbzs1an` |
| Double Socket Smart Plug (`smartplug_2_socket`) | `TS011F` | `_TZ3000_jak16dll` |
| eWeLink Temperature & Humidity Sensor (`temphumidsensor_ewelink`) | `CK-TLSR8656-SS5-01(7014)` | `eWeLink` |
| Excellux External Probe Temperature & Humidity Sensor (`temphumidsensor_excellux`) | `Excellux` | `NTCHT02` |
| Fantem 4-in-1 Multi Sensor (`fantem_zb003x`) | `TS0202` | `_TZ3210_zmy9hjay` |
| Finger Bot (`fingerbot`) | `TS0001`<br>`TS0001_fingerbot` | `_TZ3210_232nryqh`<br>`_TZ3210_dse8ogfy`<br>`_TZ3210_j4pdtz9v`<br>`_TZ3210_okbss9dy` |
| Flood sensor (`flood_sensor`) | `RH3001`<br>`TS0207` | `TUYATEC-3tipnsrx`<br>`_TZ3000_3dfewsk1`<br>`_TZ3000_4uvovz4r`<br>`_TZ3000_bfopm9ga`<br>`_TZ3000_wuep9zng`<br>`_TZ3000_ww9i3e0y` |
| Flood sensor (`flood_sensor_2`) | `TS0207` | `_TZ3000_baeiitad` |
| HOBEIAN Contact & Illuminance Sensor (`contact_lux_hobeian`) | `ZG-102ZL` | `HOBEIAN` |
| HOBEIAN Temperature & Humidity Sensor (`temphumidsensor_hobeian`) | `ZG-227Z` | `HOBEIAN` |
| HOBEIAN Water Leak Sensor (`hobeian_water_leak`) | `ZG-222Z` | `HOBEIAN` |
| Illuminance Sensor (`illuminance_sensor`) | `TS0222` | `_TZ3000_8uxxzz4b`<br>`_TZ3000_do6txrcw`<br>`_TZ3000_hy6ncvmw` |
| LCD Temperature & Humidity Sensor (`lcdtemphumidsensor`) | `TS0201`<br>`TY0201` | `_TYZB01_a476raq2`<br>`_TYZB01_hjsgdkfl`<br>`_TYZB01_iuepbmpv`<br>`_TZ2000_a476raq2`<br>`_TZ2000_avdnvykf`<br>`_TZ2000_hjsgdkfl`<br>`_TZ2000_xogb73am`<br>`_TZ3000_bjawzodf`<br>`_TZ3000_itnrsufe`<br>`_TZ3000_rusu2vzb`<br>`_TZ3000_yd2e749y`<br>`_TZ3000_ywagc4rj`<br>`_TZ3210_ncw88jfq` |
| LCD Temperature & Humidity Sensor (`lcdtemphumidsensor_2`) | `SM0201` | `_TYZB01_cbiezpds` |
| LCD Temperature & Humidity Sensor (`lcdtemphumidsensor_3`) | `TS0601` | `_TZE200_44af8vyi`<br>`_TZE200_bjawzodf`<br>`_TZE200_bq5c8xfe`<br>`_TZE200_locansqn`<br>`_TZE200_qyflbnbj`<br>`_TZE200_vs0skpuc`<br>`_TZE200_zl1kmjqx` |
| LCD Temperature, Humidity and Luminance Sensor (`lcdtemphumidluxsensor`) | `TS0201`<br>`TS0222` | `_TYZB01_ftdkanlj`<br>`_TYZB01_kvwjujy9`<br>`_TZ3000_qaaysllp`<br>`_TZ3210_huzkzqyk` |
| Livarno Lux Atmosphere Floor LED Light (`rgb_floor_led_light`) | `TS0502A` | `_TZ3000_8uaoilu9` |
| Livarno Lux Smart LED Wall Light (`rgb_wall_led_light`) | `TS0505A` | `_TZ3000_5bsf8vaj`<br>`_TZ3000_utagpnzs` |
| Motion Sensor (`motion_sensor`) | `RH3040` | `TUYATEC-bd5faf9p`<br>`TUYATEC-zw6hxafz` |
| Motion Sensor (`motion_sensor_2`) | `TS0601` | `_TZE200_1ibpyhdc`<br>`_TZE200_3towulqd`<br>`_TZE200_bh3n6gk8`<br>`_TZE200_ttcovulf` |
| Motion Sensor (`motion_sensor_3`) | `TS0601` | `_TZE200_mgxy2d9f` |
| Motion Sensor & Scene Switch (`motion_scene_switch`) | `TS0202` | `_TZ3210_cwamkvua` |
| MOWE MW815R Rain Sensor (IAS) (`rain_sensor_mowe`) | `TS0207` | `_TZ3000_o9f2zqln` |
| MTG075 Presence Sensor with Relay (`mtg075_radar_sensor`) | `TS0601` | `_TZE204_mtoaryre` |
| Outdoor Plug without metering (`outdoor_plug`) | `TS0101` | `_TZ3000_br3laukf`<br>`_TZ3000_pnzfdr9y` |
| Outdoor Smart Socket (`outdoor_2_socket`) | `TS011F` | `_TZ3000_uwkja6z1` |
| PIR Sensor (`pirsensor`) | `RH3040` | `TUYATEC-53o41joc`<br>`TUYATEC-b5g40alm`<br>`TUYATEC-deetibst`<br>`TUYATEC-dgtxmihe`<br>`TUYATEC-dxnohkpd`<br>`TUYATEC-lha8pbwd`<br>`TUYATEC-zn9wyqtr` |
| Power Strip 4 Sockets (`socket_power_strip_four_three`) | `JZ-ZB-004` | `LELLKI` |
| Power Strip 4 Sockets (`socket_power_strip_four_two`) | `TS011F` | `_TZ3000_air9m6af`<br>`_TZ3000_cfnprab5`<br>`_TZ3000_o005nuxx` |
| Power Strip Socket 1/4 (`socket_power_strip_four`) | `TS0115` | `_TYZB01_vkwryfdr` |
| Radar Sensor (`radar_sensor`) | `TS0601` | `_TZE200_holel4dk`<br>`_TZE200_ikvncluo`<br>`_TZE200_jva8ink8`<br>`_TZE200_lyetpprm`<br>`_TZE200_sgpeacqp`<br>`_TZE200_wukb7rhc`<br>`_TZE200_xpq2rzhq`<br>`_TZE200_ztc6ggyl`<br>`_TZE201_ztc6ggyl`<br>`_TZE202_ztc6ggyl`<br>`_TZE203_ztc6ggyl`<br>`_TZE204_gkfbdvyx`<br>`_TZE204_xsm7l9xa`<br>`_TZE204_ztc6ggyl` |
| Radar Sensor (`radar_sensor_2`) | `TS0601` | `_TZE204_ijxvkhd0`<br>`_TZE204_sxm7l9xa` |
| Radar Sensor (5.8 GHz) (`radar_sensor_qasjif9e`) | `TS0601` | `_TZE204_qasjif9e`<br>`_TZE204_ztqnh5cg` |
| Radar Sensor (ZY-M100 24G) (`radar_sensor_7gclukjs`) | `TS0601` | `_TZE204_7gclukjs` |
| Radar Sensor ceiling (`radar_sensor_ceiling`) | `TS0225` | `_TZE200_2aaelwxk` |
| Rain sensor (`rain_sensor`) | `TS0207` | `_TZ3210_tgvtvdoc` |
| RGB Bulb E14 (`rgb_bulb_E14`) | `TS0505A` | `_TZ3000_odygigth` |
| RGB Bulb E27 (`rgb_bulb_E27`) | `TS0505A`<br>`TS0505B`<br>`ZB-CL01` | `_TZ3000_12sxjap4`<br>`_TZ3000_dbou1ap4`<br>`_TZ3000_hlijwsai`<br>`_TZ3000_keabpigv`<br>`_TZ3000_q50zhdsc`<br>`_TZ3000_qd7hej8u`<br>`_TZ3210_mja6r5ix`<br>`eWeLight` |
| RGB Ceiling Led Light (`rgb_ceiling_led_light`) | `TS0505B` | `_TZ3210_x13bu7za` |
| RGB Led Light Bar (`rgb_led_light_bar`) | `TS0505A`<br>`TS0505B` | `_TZ3000_gek6snaj`<br>`_TZ3210_iystcadi` |
| RGB LED Strip (`rgb_led_strip`) | `TS0505A` | `_TZ3000_riwp3k79` |
| RGB LED Strip Controller (`rgb_led_strip_controller`) | `TS0503A`<br>`TS0503B`<br>`TS0504B`<br>`TS0505B` | `_TZ3000_dl4pxp1r`<br>`_TZ3000_i8l0nqdu`<br>`_TZ3000_obacbukl`<br>`_TZ3000_qqjaziws`<br>`_TZ3000_ukuvyhaa`<br>`_TZ3210_eejm8dcr`<br>`_TZ3210_k1pe6ibm` |
| RGB Mood Light (`rgb_mood_light`) | `TS0505A`<br>`TS0505B` | `_TZ3000_9cpuaca6`<br>`_TZ3210_r0xgkft5` |
| RGB Spot Garden light (`rgb_spot_GardenLight`) | `TS0505A` | `_TZ3000_h1jnz6l8` |
| RGB Spot GU10 (`rgb_spot_GU10`) | `TS0505A` | `_TZ3000_kdpxju99` |
| Siren (`siren`) | `TS0601` | `_TZE200_t1blo2bj`<br>`_TZE204_t1blo2bj` |
| Siren, Temperature & Humidity Sensor (`sirentemphumidsensor`) | `TS0601` | `_TYST11_d0yu2xgi`<br>`_TZE200_d0yu2xgi` |
| Slim motion sensor (`slim_motion_sensor`) | `TS0202` | `_TZ3000_lf56vpxj` |
| Smart Air Detection Box (`smart_air_detection_box`) | `TS0601` | `_TZE200_8ygsuhe1`<br>`_TZE200_c2fmom5z`<br>`_TZE200_mja3fuja`<br>`_TZE200_ryfmq5rl`<br>`_TZE200_yvx5lh6k` |
| Smart Button Switch (`smart_button_switch`) | `TS0041` | `_TZ3000_fa9mlvja`<br>`_TZ3000_qgwcxxws`<br>`_TZ3000_yj6k7vfo` |
| Smart Door & Window Sensor (Lidl) (`smart_door_window_sensor`) | `TS0203`<br>`TY0203` | `_TZ1800_ejwkn2h2`<br>`_TZ3000_rcuyhwe3` |
| Smart Garden Irrigation Controller (`smart_garden_irrigation_control`) | `TS0049`<br>`TS0101` | `_TZ3000_cjfmu5he`<br>`_TZ3000_kz1anoi8`<br>`_TZ3000_mq4wujmp`<br>`_TZ3210_eymunffl` |
| Smart Knob Switch (`smart_knob_switch`) | `TS004F` | `_TZ3000_4fjiwweb`<br>`_TZ3000_abrsvsou`<br>`_TZ3000_ixla93vd`<br>`_TZ3000_qja6nq5z`<br>`_TZ3000_uri7ongn` |
| Smart Motion Sensor (Lidl) (`smart_motion_sensor`) | `TY0202` | `_TZ1800_fcdjzz3s` |
| Smart PIR Motion Sensor (`pir_sensor_2`) | `TS0202` | `_TYZB01_dl7cejts`<br>`_TYZB01_dr6sduka`<br>`_TYZB01_geepvxsy`<br>`_TYZB01_jytabjkb`<br>`_TZ3000_6ygjfyll`<br>`_TZ3000_bsvqrxru`<br>`_TZ3000_c8ozah8n`<br>`_TZ3000_kmh5qpmb`<br>`_TZ3000_mcxw5ehu`<br>`_TZ3000_mg4dy6z6`<br>`_TZ3000_mmtwjmaq`<br>`_TZ3000_msl6wxk9`<br>`_TZ3000_nss8amz9`<br>`_TZ3000_o4mkahkc`<br>`_TZ3000_otvn3lne`<br>`_TZ3000_y56pgpgs`<br>`_TZ3040_6ygjfyll`<br>`_TZ3040_bb6xaihh`<br>`_TZ3040_wqmtjsyk` |
| Smart PIR Motion Sensor (`pir_sensor_3`) | `TS0202` | `_TZ3000_hgu1dlak` |
| Smart PIR Motion Sensor (`pir_sensor_4`) | `TS0202` | `_TZ3040_o4mkahkc` |
| Smart Plug DIN Rail (`smartPlug_DinRail`) | `TS011F`<br>`TS0121`<br>`TSO121` | `_TZ3000_6l1pjfqe`<br>`_TZ3000_cayepv1a`<br>`_TZ3000_lepzuhto`<br>`_TZ3000_qeuvnohg`<br>`_TZ3000_qystbcjg` |
| Smart Plug with metering (`smartplug`) | `TS011F`<br>`TS0121`<br>`TSO121` | `Zbeacon`<br>`_TYZB01_iuepbmpv`<br>`_TZ3000_0zfrhq4i`<br>`_TZ3000_1h2x4akh`<br>`_TZ3000_2putqrmw`<br>`_TZ3000_3ias4w4o`<br>`_TZ3000_3ooaz3ng`<br>`_TZ3000_3uimvkn6`<br>`_TZ3000_5f43h46b`<br>`_TZ3000_5ity3zyu`<br>`_TZ3000_88iqnhvd`<br>`_TZ3000_8nkb7mof`<br>`_TZ3000_amdymr71`<br>`_TZ3000_amdymr7l`<br>`_TZ3000_bfn1w0mm`<br>`_TZ3000_cehuw1lw`<br>`_TZ3000_cjrngdr3`<br>`_TZ3000_cphmq0q7`<br>`_TZ3000_dksbtrzs`<br>`_TZ3000_dpo1ysak`<br>`_TZ3000_dvqt7qrw`<br>`_TZ3000_ew3ldmgx`<br>`_TZ3000_eyzb8yg3`<br>`_TZ3000_fqoynhku`<br>`_TZ3000_fukaa7nc`<br>`_TZ3000_g5xawfcq`<br>`_TZ3000_gjnozsaz`<br>`_TZ3000_gnjozsaz`<br>`_TZ3000_gvn91tmx`<br>`_TZ3000_gznh2xla`<br>`_TZ3000_hdopuwv6`<br>`_TZ3000_iiacqpdz`<br>`_TZ3000_j1v25l17`<br>`_TZ3000_ksw8qtmt`<br>`_TZ3000_kx0pris5`<br>`_TZ3000_mraovvmm`<br>`_TZ3000_nkcobies`<br>`_TZ3000_npg02xft`<br>`_TZ3000_okaz9tjs`<br>`_TZ3000_pjcqjtev`<br>`_TZ3000_r6buo8ba`<br>`_TZ3000_rdfh8cfs`<br>`_TZ3000_rdtixbnu`<br>`_TZ3000_ss98ec5d`<br>`_TZ3000_typdpbpg`<br>`_TZ3000_typdpdpg`<br>`_TZ3000_u5u4cakc`<br>`_TZ3000_uwaort14`<br>`_TZ3000_vtscrpmw`<br>`_TZ3000_w0qqde0g`<br>`_TZ3000_waho4jtj`<br>`_TZ3000_ww6drja5`<br>`_TZ3000_wzmuk9ai`<br>`_TZ3000_ynmowqk2`<br>`_TZ3000_zgtbi4oy`<br>`_TZ3000_zloso4jk`<br>`_TZ3210_4ux0ondb`<br>`_TZ3210_5ct6e7ye`<br>`_TZ3210_cehuw1lw`<br>`_TZ3210_ddigca5n` |
| Smart Plug without metering (`plug`) | `TS011F` | `_TZ3000_cymsnfvf`<br>`_TZ3000_ew31dmgx`<br>`_TZ3000_hyfvrar3`<br>`_TZ3000_kdi2o9m6`<br>`_TZ3000_plyvnuf5`<br>`_TZ3000_upjrsxh1`<br>`_TZ3000_wamqdr3f`<br>`_TZ3000_wxtp7c5y` |
| Smart Switch (`smart_switch`) | `TS0001` | `_TYZB01_phjeraqq` |
| Smoke Sensor (`smoke_sensor`) | `TS0205` | `_TYZB01_dsjszp0x`<br>`_TYZB01_tob46aoq`<br>`_TYZB01_wqcac7lo` |
| Smoke Sensor (`smoke_sensor_smoke_only`) | `TS0601` | `_TZE200_m9skfctm`<br>`_TZE200_rccxox8p`<br>`_TZE200_vzekyi4c` |
| Smoke Sensor (`smoke_sensor2`) | `TS0601` | `_TZE200_ntcy3xu1`<br>`_TZE200_t5p1vj8r`<br>`_TZE200_uebojraa`<br>`_TZE200_yh7aoahi`<br>`_TZE204_ntcy3xu1` |
| Smoke Sensor (`smoke_sensor3`) | `TS0205` | `_TZ3210_up3pngle` |
| Soil Sensor (`soilsensor`) | `TS0601` | `_TZE200_2se8efxh`<br>`_TZE200_9cqcpkgb`<br>`_TZE200_ga1maeof`<br>`_TZE200_myd45weu`<br>`_TZE204_myd45weu` |
| Soil Sensor (`soilsensor_2`) | `TS0601` | `_TZE284_aao3yzhs`<br>`_TZE284_g2e6cpnw`<br>`_TZE284_sgabhwa6` |
| Standard Zigbee Water Leak Sensor (battery unverified) (`flood_sensor_unverified_battery`) | `TS0207` | `_TZ3000_4qaowtdo`<br>`_TZ3000_bzt33cyu`<br>`_TZ3000_qhozxs2b` |
| Temperature & Humidity Sensor (`temphumidsensor`) | `RH3052`<br>`TS0201` | `TUYATEC-1g3tawnp`<br>`TUYATEC-1uxx9cci`<br>`TUYATEC-Bfq2i2Sy`<br>`TUYATEC-HaoiuWzy`<br>`TUYATEC-abkehqus`<br>`TUYATEC-g3gl6cgy`<br>`TUYATEC-gqhxixyk`<br>`TUYATEC-ojmxeikg`<br>`TUYATEC-ojmxeikq`<br>`TUYATEC-prhs1rsd`<br>`TUYATEC-riuj5xzs`<br>`TUYATEC-v3uxbuxy`<br>`TUYATEC-vmgh3fxd`<br>`TUYATEC-yg5dcbfu`<br>`_TZ3000_8ybe88nf`<br>`_TZ3000_bgsigers`<br>`_TZ3000_bguser20`<br>`_TZ3000_f2bw0b6k`<br>`_TZ3000_fie1dpkm`<br>`_TZ3000_i8jfiezr`<br>`_TZ3000_unw0hpdv` |
| Temperature & Humidity Sensor (`temphumidsensor2`) | `RH3052`<br>`TS0201` | `TUYATEC-qun7vq14`<br>`_TZ3000_0s1izerx`<br>`_TZ3000_akqdg6g7`<br>`_TZ3000_dowj6gyi` |
| Temperature & Humidity Sensor (`temphumidsensor3`) | `TS0201`<br>`TS0601` | `Wing`<br>`Zbeacon`<br>`_TZ3000_6uzkisv2`<br>`_TZ3000_fllyghyj`<br>`_TZ3000_saiqcn0y`<br>`_TZ3000_utwgoauk`<br>`_TZ3000_v1w2k9dd`<br>`_TZ3000_xr3htd96`<br>`_TZ3000_zl1kmjqx`<br>`_TZE200_a8sdabtg` |
| Temperature & Humidity Sensor (`temphumidsensor4`) | `TS0601` | `_TZE200_cirvgep4`<br>`_TZE200_utkemkbs`<br>`_TZE200_yjjdcqsq`<br>`_TZE204_9yapgbuv`<br>`_TZE204_cirvgep4`<br>`_TZE204_upagmta9`<br>`_TZE204_utkemkbs`<br>`_TZE204_yjjdcqsq` |
| Temperature & Humidity Sensor (`temphumidsensor5`) | `TS0601` | `_TZE200_9yapgbuv` |
| Temperature & Humidity Sensor (TH05Z) (`temphumidsensor_vvmbj46n`) | `TS0601` | `_TZE200_vvmbj46n` |
| Thermostatic Radiator Valve (`thermostatic_radiator_valve`) | `TS0601` | `_TZE200_7yoranx2`<br>`_TZE200_e9ba97vf`<br>`_TZE200_hue3yfsn`<br>`_TZE200_husqqvux`<br>`_TZE200_kds0pmmv`<br>`_TZE200_kly8gjlz`<br>`_TZE200_lllliz3p`<br>`_TZE200_lnbfnyxd`<br>`_TZE200_mudxchsu`<br>`_TZE200_py4cm3he`<br>`_TZE200_sur6q7ko` |
| TS0001 Single-Channel On/Off Switch (`switch_1_gang_ts0001`) | `TS0001` | `_TZ3000_0t4zjtia`<br>`_TZ3000_hyarhbyx`<br>`_TZ3000_p26flek3`<br>`_TZ3000_y4che4dc` |
| TS0002 Two-Channel On/Off Switch (`switch_2_gang_ts0002`) | `TS0002` | `_TZ3000_l9brjwau`<br>`_TZ3000_lugaswf8`<br>`_TZ3000_pgcclddi`<br>`_TZ3000_ptjcjise`<br>`_TZ3000_rmiew70n`<br>`_TZ3000_zxrfobzw` |
| TS0003 Three-Channel Wall Switch (`switch_3_gang_ts0003`) | `TS0003` | `_TZ3000_iol4bl2y`<br>`_TZ3000_lmcp6b0a`<br>`_TZ3000_qkixdnon`<br>`_TZ3000_v4l4b0lp` |
| TS0004 Four-Channel On/Off Switch (`switch_4_gang_ts0004`) | `TS0004` | `_TZ3000_enmfaave`<br>`_TZ3000_s6ma1nh4` |
| TS0201 Standard Temperature & Humidity (`temphumidsensor_tsgqxdb4`) | `TS0201` | `_TZ3000_tsgqxdb4` |
| TS0601 Contact & Illuminance Sensor (`contact_lux_pay2byax`) | `TS0601` | `_TZE200_pay2byax` |
| Tunable Bulb E14 (`tunable_bulb_E14`) | `TS0502A` | `_TZ3000_oborybow` |
| Tunable Bulb E27 (`tunable_bulb_E27`) | `TS0502A` | `_TZ3000_49qchf10` |
| Tunable Spot GU10 (`tunable_spot_GU10`) | `TS0502A` | `_TZ3000_el5kt5im` |
| Valve Controller (`valvecontroller`) | `TS0001`<br>`TS0111`<br>`TS011F` | `_TYZB01_4tlksk8a`<br>`_TYZB01_ymcdbl3u`<br>`_TZ3000_5ucujjts`<br>`_TZ3000_iedbgyxt`<br>`_TZ3000_j9568h44`<br>`_TZ3000_o4cjetlm`<br>`_TZ3000_tvuarksa`<br>`_TZ3000_w0ypwa1f`<br>`_TZ3000_wpueorev` |
| Wall Dimmer (`wall_dimmer_tuya`) | `TS0601` | `_TZE200_0nauxa0p`<br>`_TZE200_3p5ydos3`<br>`_TZE200_9cxuhakf`<br>`_TZE200_9i9dt8is`<br>`_TZE200_a0syesf5`<br>`_TZE200_ctq0k47x`<br>`_TZE200_dfxkcots`<br>`_TZE200_ebwgzdqq`<br>`_TZE200_ojzhk75b`<br>`_TZE200_p0gzbqct`<br>`_TZE200_swaamsoy`<br>`_TZE200_w4cryh2i`<br>`_TZE200_whpb9yts`<br>`_TZE204_vevc4c6g` |
| Wall mounted Curtain Switch (`wall_curtain_switch`) | `TS130F` | `_TZ3000_8kzqqzu4`<br>`_TZ3000_ctbafvhm`<br>`_TZ3000_dbpmpco1`<br>`_TZ3000_dph3rpss`<br>`_TZ3000_fvhunhxb`<br>`_TZ3000_ltiqubue`<br>`_TZ3000_qa8s8vca`<br>`_TZ3000_qqdbccb3`<br>`_TZ3000_wptayaqr` |
| Wall Socket with metering (`wall_socket`) | `TS011F` | `_TZ3000_4ux0ondb`<br>`_TZ3000_5ct6e7ye`<br>`_TZ3000_b28wrpvx`<br>`_TZ3000_y4ona9me` |
| Wall Switch (1/4 Gang) (`wall_switch_4_gang`) | `TS0014`<br>`TS0044` | `_TYZB01_bagt1e4o`<br>`_TZ3000_dku2cfsc`<br>`_TZ3000_fjt5218m`<br>`_TZ3000_r0pmi2p3` |
| Wall Thermostat (`wall_thermostat`) | `TS0601` | `_TZE200_2ekuz3dz`<br>`_TZE200_aoclfnxz`<br>`_TZE204_aoclfnxz` |
| Water Detector (`water_detector`) | `TS0207`<br>`q9mpfhw` | `_TYST11_qq9mpfhw`<br>`_TYZB01_sqmd19i1`<br>`_TZ3000_0s9gukzt`<br>`_TZ3000_6oabgtzv`<br>`_TZ3000_85czd6fy`<br>`_TZ3000_awvmkayh`<br>`_TZ3000_eit7p838`<br>`_TZ3000_fxvjhdyl`<br>`_TZ3000_k4ej3ww2`<br>`_TZ3000_kstbkt6a`<br>`_TZ3000_kyb656no`<br>`_TZ3000_mugyhz0q`<br>`_TZ3000_ocjlo4ea`<br>`_TZ3000_t6jriawg` |
| Water Detector (2×AAA) (`water_detector_2aaa`) | `SNZB-05`<br>`TS0207` | `_TZ3000_upgcbody` |
| Water Leak Sensor (`water_leak_sensor_tuya`) | `TS0601` | `_TZE200_qq9mpfhw` |
| Water Leak Sensor (WLS-100z) (`water_leak_sensor_jthf7vb6`) | `TS0601` | `_TZE200_jthf7vb6` |
| Zigbee Repeater (`zigbee_repeater`) | `TS0207` | `_TZ3000_5k5vh43t`<br>`_TZ3000_gszjt2xx`<br>`_TZ3000_m0vaazab`<br>`_TZ3000_misw04hq`<br>`_TZ3000_nkkl7uzv`<br>`_TZ3000_nlsszmzl`<br>`_TZ3000_ufttklsz`<br>`_TZ3000_wlquqiiz` |
<!-- END GENERATED DEVICE INDEX -->

## White-label brands seen in supported devices

- Alecto
- Alice
- Avatto
- BSEED
- Blitzwolf
- eWeLight
- GiEX
- GIRIER
- Hangzlou
- Inmax
- Lidl
- Livarno LUX
- Lonsonho
- LoraTap
- Luminea
- Malmbergs
- Melinera
- MOES
- Nedis
- Neo
- Nous
- ONENUO
- Samotech
- Silvercrest
- Smart9
- Tenky
- Tongou
- UseeLink
- Woox
- YANDHI
- Zemismart
and many more..

## Device IDs

**Sensors**
- Temperature and Humidity Sensor
    TUYATEC-g3gl6cgy / RH3052
    TUYATEC-Bfq2i2Sy / RH3052
    TUYATEC-abkehqus / RH3052
    TUYATEC-yg5dcbfu / RH3052
    TUYATEC-prhs1rsd / RH3052
    TUYATEC-gqhxixyk / RH3052
    TUYATEC-vmgh3fxd / RH3052
    TUYATEC-ojmxeikg / RH3052
    TUYATEC-1g3tawnp / RH3052
    _TZ3000_i8jfiezr / TS0201
    TUYATEC-v3uxbuxy / RH3052
    _TZ3000_bguser20 / TS0201
    _TZ3000_dowj6gyi / TS0201
    _TZ3000_fllyghyj / TS0201
    _TZ3000_8ybe88nf / TS0201
    _TZ3000_fie1dpkm / TS0201
    _TZ3000_0s1izerx / TS0201
    TUYATEC-ojmxeikq / RH3052
    TUYATEC-riuj5xzs / RH3052
    _TZ3000_xr3htd96 / TS0201 (Tenky)
    _TZ3000_saiqcn0y / TS0201
    TUYATEC-1uxx9cci / RH3052
    _TZE200_a8sdabtg / TS0601
    _TZ3000_utwgoauk / TS0601
    _TZE200_9yapgbuv / TS0601
    _TZ3000_f2bw0b6k / TS0201
    _TZ3000_zl1kmjqx / TS0201
    TUYATEC-HaoiuWzy / RH3052
    TUYATEC-qun7vq14 / RH3052
    _TZE200_yjjdcqsq / TS0601
    _TZE200_utkemkbs / TS0601
    _TZ3000_6uzkisv2 / TS0601
    _TZ3000_akqdg6g7 / TS0201

- LCD Temperature and Humidity Sensor
    _TZ2000_a476raq2 / TS0201
    _TZ2000_xogb73am / TS0201
    _TZ2000_avdnvykf / TS0201
    _TZ2000_hjsgdkfl / TS0201
    _TYZB01_a476raq2 / TS0201
    _TYZB01_hjsgdkfl / TS0201
    _TYZB01_iuepbmpv / TS0201
    _TZ3000_rusu2vzb / TS0201
    _TYZB01_cbiezpds / SM0201
    _TZE200_bjawzodf / TS0601
    _TZE200_zl1kmjqx / TS0601
    _TZE200_locansqn / TS0601
    _TZE204_yjjdcqsq / TS0601
    _TZ3000_yd2e749y / TS0201
    _TZ3000_ywagc4rj / TS0201
    _TZ3000_itnrsufe / TS0201
    _TZ3000_bjawzodf / TY0201
    _TZ3210_ncw88jfq / TY0201
    _TZE200_vvmbj46n / TY0201
    _TZE204_upagmta9 / TS0601
    _TZE200_cirvgep4 / TS0601
    _TZE200_bq5c8xfe / TS0601
    _TZE200_qyflbnbj / TS0601
    _TZE200_vs0skpuc / TS0601
    _TZE200_44af8vyi / TS0601

- LCD Temperature, Humidity and Luminance Sensor
    _TZ3000_qaaysllp / TS0201 (NEO)
    _TYZB01_ftdkanlj / TS0222
    _TYZB01_kvwjujy9 / TS0222
    _TZ3210_huzkzqyk / TS0201

- PIR Sensor
    TUYATEC-lha8pbwd / RH3040
    TUYATEC-zn9wyqtr / RH3040
    TUYATEC-53o41joc / RH3040
    TUYATEC-deetibst / RH3040
    TUYATEC-dgtxmihe / RH3040
    _TYZB01_jytabjkb / TS0202
    _TYZB01_dl7cejts / TS0202
    _TZ3000_mmtwjmaq / TS0202
    _TZ3000_kmh5qpmb / TS0202
    _TZ3000_msl6wxk9 / TS0202
    _TZ3000_mcxw5ehu / TS0202
    _TZ3000_otvn3lne / TS0202
    _TZ3000_6ygjfyll / TS0202
    _TZ3040_6ygjfyll / TS0202
    _TZ3040_bb6xaihh / TS0202
    TUYATEC-b5g40alm / RH3040
    _TZ3000_nss8amz9 / TS0202
    TUYATEC-dxnohkpd / RH3040
    _TZ3000_bsvqrxru / TS0202
    _TYZB01_dr6sduka / TS0202 (TESLA)

- Motion Sensor
    TUYATEC-bd5faf9p / RH3040 (Nedis)
    _TZ1800_fcdjzz3s / TY0202 (Silvercrest / Lidl)
    _TZE200_3towulqd / TS0601
    _TZ3000_lf56vpxj / TS0202
    TUYATEC-zw6hxafz / RH3040
    _TZE200_bh3n6gk8 / TS0601
    _TZE200_1ibpyhdc / TS0601
    _TZE200_ttcovulf / TS0601

- Door/Windows Sensor
    TUYATEC-g3gl6cgy / RH3001
    TUYATEC-Bfq2i2Sy / RH3001
    TUYATEC-abkehqus / RH3001
    TUYATEC-sb6t7ett / RH3001
    TUYATEC-rkqiqvcs / RH3001
    TUYATEC-crr8qb0p / RH3001
    _TZ3000_ebar6ljy / TS0203
    TUYATEC-kbqf60nt / RH3001
    TUYATEC-r9hgssol / RH3001
    TUYATEC-0l6xaqmi / RH3001
    TUYATEC-trhrga6p / RH3001
    TUYATEC-ip9ganvw / RH3001
    _TYZB01_xph99wvr / RH3001
    _TZ3000_2mbfxlzr / RH3001
    _TZ3000_402jjyro / RH3001
    _TZ3000_6jeesvrt / TS0203
    _TZ3000_26fmupbb / TS0203
    _TZ3000_bmg14ax2 / TS0203
    _TZ3000_oxslv1c9 / TS0203
    _TZ3000_bzxlofth / TS0203
    _TZ3000_bzxloft / TS0203
    _TZ3000_7tbsruql / TS0203
    _TZ3000_osu834un / TS0203
    _TZ3000_n2egfsli / TS0203
    _TZ3000_7d8yme6f / TS0203
    _TZ3000_rgchmad8 / TS0203
    _TZ3000_au1rjicn / TS0203
    _TZ3000_4ugnzsli / TS0203
    TUYATEC-7qunn4gq / RH3001
    _TZ3000_zgrffiwg / TS0203
    Immax / DoorWindow-Sensor-ZB3.0
    Visonic / MCT-340 E
    zbeacon / DS01
    _TZ3000_decxrtwa / TS0203
    _TZ3000_hkcpblrs / TS0203 (Avatto)
    _TZ3000_yxqnffam / TS0203 (Immax Neo)
    _TZ3000_9eeavbk5 / TS0203
    _TZ3000_bpkijo14 / TS0203
    _TZ3000_a33rw7ou / TS0203 (Zemismart)
    _TZ3000_6zvw8ham / TS0203
    _TZ3000_yfekcy3n / TS0203
    _TZ3000_cea5xugq / TS0203
    _TZ3000_rcuyhwe3 / TS0203
    _TZ3000_1bwpjvlz / TS0203
    _TZ3000_au2o5e6q / TS0203
    _TZ3000_uvti8nkd / TS0203
    _TZ3000_v7chgqso / TS0203
    _TZ3000_8yhypbo7 / TS0203
    _TZ1800_ejwkn2h2 / TY0203 (Silvercrest / Lidl)
    _TZ3000_cqlnswn0 / TY0203 (TESLA)
    _TZ3000_qrldbmfn / TS0203
    _TZ3000_gntwytxo / TS0203
    _TZ3000_n2egfsli / SNZB-04

- Water Detector
    _TYZB01_sqmd19i1 / TS0207
    _TYST11_qq9mpfhw / q9mpfhw (Neo)
    _TZ3000_fxvjhdyl / TS0207
    _TZ3000_eit7p838 / TS0207 (Blitzwolf)
    _TZ3000_t6jriawg / TS0207
    _TZ3000_85czd6fy / TS0207
    _TZ3000_kyb656no / TS0207 (Meian)
    _TZ3000_0s9gukzt / TS0207 (Nous)
    _TZ3000_kstbkt6a / TS0207 (Hangzlou / IH-K655 / Aubess)
    _TZ3000_mugyhz0q / TS0207 (ONENUO)
    _TZ3000_upgcbody / TS0207 (ONENUO / Aubess)
    _TZ3000_k4ej3ww2 / TS0207 (Aubess)
    _TZ3000_6oabgtzv / TS0207
    _TZ3000_ocjlo4ea / TS0207
    _TZ3000_awvmkayh / TS0207 (Niceboy)

- Water Leak Sensor
    _TZE200_qq9mpfhw / TS0601
    _TZE200_jthf7vb6 / TS0601

- Flood Sensor
    TUYATEC-3tipnsrx / RH3001
    _TZ3000_4uvovz4r / TS0207
    _TZ3000_3dfewsk1 / TS0207
    _TZ3000_ww9i3e0y / TS0207
    _TZ3000_wuep9zng / TS0207

- Smoke Sensor
    _TYZB01_dsjszp0x / TS0205
    _TZE200_ntcy3xu1 / TS0601
    _TZE200_m9skfctm / TS0601
    _TZ3210_up3pngle / TS0205
    _TZE200_rccxox8p / TS0601
    _TZE200_vzekyi4c / TS0601
    _TYZB01_wqcac7lo / TS0205
    _TZE204_ntcy3xu1 / TS0601
    _TZE200_t5p1vj8r / TS0601
    _TZE200_uebojraa / TS0601
    _TZE200_yh7aoahi / TS0601

- Soil humidity sensor
    _TZE200_myd45weu / TS0601 (GiEX)
    _TZE200_ga1maeof / TS0601
    _TZE200_9cqcpkgb / TS0601
    _TZE204_myd45weu / TS0601
    _TZE284_aao3yzhs / TS0601
    _TZE284_sgabhwa6 / TS0601
    _TZE200_2se8efxh / TS0601
    _TZE284_g2e6cpnw / TS0601

- Radar Sensor
    _TZE200_ztc6ggyl / TS0601
    _TZE201_ztc6ggyl / TS0601
    _TZE202_ztc6ggyl / TS0601
    _TZE203_ztc6ggyl / TS0601
    _TZE204_ztc6ggyl / TS0601
    _TZE204_qasjif9e / TS0601
    _TZE204_ijxvkhd0 / TS0601
    _TZE204_sxm7l9xa / TS0601
    _TZE200_2aaelwxk / TS0225
    _TZE200_sgpeacqp / TS0601
    _TZE204_xsm7l9xa / TS0601
    _TZE200_wukb7rhc / TS0601
    _TZE200_xpq2rzhq / TS0601
    _TZE200_holel4dk / TS0601
    _TZE200_jva8ink8 / TS0601
    _TZE200_lyetpprm / TS0601
    _TZE200_ikvncluo / TS0601
    _TZE204_ztqnh5cg / TS0601
    _TZE204_7gclukjs / TS0601

- Air Detection Box
    _TZE200_yvx5lh6k / TS0601
    _TZE200_8ygsuhe1 / TS0601
    _TZE200_mja3fuja / TS0601
    _TZE200_ryfmq5rl / TS0601
    _TZE200_c2fmom5z / TS0601

- Rain sensor
    _TZ3210_tgvtvdoc / TS0207

**Plugs, Sockets and Socket Strips**
- Smart Plug, with metering
    _TZ3000_3ooaz3ng / TS0121
    _TYZB01_iuepbmpv / TS0121
    _TZ3000_g5xawfcq / TS0121
    _TZ3000_vtscrpmw / TS0121
    _TZ3000_rdtixbnu / TS0121
    _TZ3000_8nkb7mof / TS0121
    _TZ3000_mraovvmm / TS011F (Blitzwolf)
    _TZ3000_cphmq0q7 / TS011F
    _TZ3000_ew3ldmgx / TS011F
    _TZ3000_dpo1ysak / TS011F
    _TZ3000_w0qqde0g / TS011F (Neo)
    _TZ3000_u5u4cakc / TS011F (Blitzwolf)
    _TZ3000_typdpdpg / TS011F
    _TZ3000_ksw8qtmt / TS011F
    _TZ3000_zloso4jk / TS011F
    _TZ3000_cehuw1lw / TS011F
    _TZ3000_5f43h46b / TS011F
    _TZ3000_fqoynhku / TS0121
    _TZ3000_ynmowqk2 / TS011F (Silvercrest)
    _TZ3000_kx0pris5 / TS011F
    _TZ3000_hdopuwv6 / TS011F
    _TZ3000_bfn1w0mm / TS011F
    _TZ3000_0zfrhq4i / TS011F
    _TZ3000_gznh2xla / TS011F
    _TZ3000_ss98ec5d / TS011F
    _TZ3000_gnjozsaz / TS011F
    _TZ3000_gjnozsaz / TS011F
    _TZ3000_gvn91tmx / TS011F
    _TZ3000_1h2x4akh / TS011F
    _TZ3000_r6buo8ba / TS011F
    _TZ3000_2putqrmw / TS011F
    _TZ3000_5ity3zyu / TS0121
    _TZ3000_okaz9tjs / TS011F
    _TZ3000_eyzb8yg3 / TS0121
    _TZ3000_dksbtrzs / TS011F (Lonsonho)
    _TZ3000_j1v25l17 / TS011F (Silvercrest / Lidl)
    _TZ3000_nkcobies / TS011F
    _TZ3000_waho4jtj / TS011F
    _TZ3000_3uimvkn6 / TS011F
    _TZ3000_pjcqjtev / TS011F
    _TZ3000_ww6drja5 / TS011F
    _TZ3000_fukaa7nc / TS011F
    _TZ3000_88iqnhvd / TS011F
    _TZ3000_3ias4w4o / TS011F
    _TZ3000_wzmuk9ai / TS011F

- Smart Plug, without metering
    _TZ3000_kdi2o9m6 / TS011F (Silvercrest / Lidl)
    _TZ3000_ew31dmgx / TS011F
    _TZ3000_dpo1ysak / TS011F
    _TZ3000_plyvnuf5 / TS011F (Silvercrest / Lidl)
    _TZ3000_hyfvrar3 / TS011F (Zemismart)
    _TZ3000_cymsnfvf / TS011F
    _TZ3000_upjrsxh1 / TS011F (Silvercrest / Lidl)
    _TZ3000_wamqdr3f / TS011F (Silvercrest / Lidl)

- Outdoor Plug, without metering
    _TZ3000_pnzfdr9y / TS0101 (Silvercrest / Lidl)
    _TZ3000_br3laukf / TS0101

- Outdoor Plug, with metering
    _TZ3000_uwkja6z1 / TS011F (Nous)

- 3 Socket Power Strip
    _TZ3000_1obwwnmq / TS011F (Silvercrest / Lidl)
    _TZ3000_vzopcetz / TS011F (Silvercrest / Lidl)
    _TZ3000_4uf3d0ax / TS011F (Silvercrest / Lidl)
    _TZ3000_wzauvbcs / TS011F (Silvercrest / Lidl)
    _TZ3000_vmpbygs5 / TS011F (Silvercrest / Lidl)

- 4 Socket Power Strip + USB
    _TYZB01_vkwryfdr / TS0115
    _TZ3000_o005nuxx / TS011F (UseeLink)
    _TZ3000_cfnprab5 / TS011F
    LELLKI / JZ-ZB-004

- Double Socket Smart Plug
    _TZ3000_jak16dll / TS011F

- Double Power Point
    _TYZB01_hlla45kx / TS011F

- Double Power Point, with metering
    _TZ3210_7jnk7l3k / TS011F

- Wall Socket with metering
    _TZ3000_b28wrpvx / TS011F (BSEED)
    _TZ3000_4ux0ondb / TS011F (BSEED)
    _TZ3000_y4ona9me / TS011F (Alice)
    _TZ3000_5ct6e7ye / TS011F

- DIN-rail relay with metering
    _TZ3000_qeuvnohg / TS011F
    _TZ3000_cayepv1a / TS011F (Tongou)
    _TZ3000_lepzuhto / TS011F
    _TZ3000_qystbcjg / TS011F
    _TZ3000_6l1pjfqe / TS011F

**In-Wall**
- 1 Gang Switch Module
    _TYZB01_ncutbjdi / TS0003
    _TYZB01_aneiicmq / TS0003
    _TZ3000_zmy1waw6 / TS011F
    _TZ3000_pmvbt5hh / TS0011
    _TZ3000_sjpl9eg3 / TS0011
    _TZ3000_m9af2l6g / TS000F
    _TZ3000_ji4araar / TS0011
    _TZ3000_qmi1cfuq / TS0011
    _TZ3000_npzfdcof / TS0001
    _TZ3000_tqlv4ug4 / TS0001
    _TZ3000_rmjr4ufz / TS0001
    _TZ3000_mx3vgyea / TS000F
    _TZ3000_46t1rvdu / TS0001
    _TZ3000_majwnphg / TS0001
    _TZ3000_6axxqqi2 / TS0001

- 1 Gang Switch Module with metering
    _TZ3000_prits6g4 / TS0001

- 2 Gang Switch Module
    _TYZB01_zsl6z0pw / TS0003
    _TZ3000_4js9lo5d / TS0012
    _TZ3000_pmz6mjyu / TS011F
    _TYZB01_digziiav / TS0003
    _TZ3000_fisb3ajo / TS0002
    _TZ3000_bvrlqyj7 / TS0002
    _TZ3000_jl7qyupf / TS0013
    _TZ3000_7ed9cqgi / TS0002
    _TZ3000_18ejxno0 / TS0012
    _TZ3000_llfaquvp / TS0012
    _TZ3000_lmlsduws / TS0002
    _TZ3000_qaa59zqd / TS0002
    _TZ3000_qcgw8qfa / TS0002 (Zemismart)
    _TZ3000_jcfje0kb / TS0002
    _TZ3000_ruxexjfz / TS0002

- 2 Gang Switch Module with metering
    _TZ3000_zmy4lslw / TS0002
    _TZ3000_cayepv1a / TS011F

- 3 Gang Switch Module
    _TZ3000_odzoiovu / TS0003
    _TZ3000_lvhy15ix / TS0003
    _TZ3000_4o16jdca / TS0003

- 1 Gang Dimmer Module
    _TYZB01_qezuin6k / TS110F
    _TZ3210_ngqk6jia / TS110E
    _TZ3000_ktuoyvt5 / TS110F
    _TZ3210_zxbtub8r / TS110E
    _TZE200_la2c2uo9 / TS0601
    _TZ3210_weaqkhab / TS110E
    _TZ3210_k1msuvg6 / TS110E
    _TZE204_hlx9tnzb / TS0601
    _TZ3000_mgusv51k / TS0052
    _TZE200_ip2akl4w / TS0601
    _TZE200_1agwnems / TS0601
    _TZE200_579lguh2 / TS0601
    _TZE200_vucankjx / TS0601
    _TZE200_4mh6tyyo / TS0601
    _TZE204_n9ctkb6j / TS0601
    _TZE204_9qhuzgo0 / TS0601
    _TZE204_dcnsggvz / TS0601
    _TZE204_5cuocqty / TS0601

- 2 Gang Dimmer Module
    _TYZB01_v8gtiaed / TS110F
    _TZ3000_92chsky7 / TS110F
    _TZE200_e3oitdyu / TS0601
    _TZ3210_wdexaypg / TS110E
    _TZ3210_3mpwqzuu / TS110E
    _TZE204_zenj4lxv / TS0601 (MOES)
    _TZE204_bxoo2swd / TS0601
    _TZ3210_pagajpog / TS110E
    _TZ3210_4ubylghk / TS110E
    _TZE200_gwkapsoq / TS0601
    _TZE200_fjjbhx9d / TS0601
    _TZ3000_7ysdnebc / TS1101

**On-Wall**
- 1 Gang Wall Switch
    _TYZB01_xfpdrwvc / TS0011
    _TZ3000_9hpxg80k / TS0011
    _TZ3000_f8tmviy0 / TS0001
    _TZ3000_gidy6sjs / TS0001
    _TYZB01_qeqvmvti / TS0011 (MOES)
    _TYZB01_seqwasot / TS0001
    _TZ3000_hktqahrq / TD0001
    _TZ3000_yl3zuyaw / TS0001
    _TZ3000_3wkqni6o / TS0011
    _TZ3000_oex7egmt / TS0001
    _TZ3000_hafsqare / TS0011
    _TZ3000_oaq83gqc / TS0011
    _TZ3000_6eyydfyg / TS0001
    _TZE200_gbagoilo / TS0601
    _TZ3000_hhiodade / TS0011
    _TZ3000_ysdv91bk / TS0001
    _TZ3000_7jx5ypra / TS0001
    _TZ3000_3u4hripk / TS0011

- 2 Gang Wall Switch
    _TYZB01_mtlhqn48 / TS0012
    _TYZB01_6sadkhcy / TS0002
    _TZ3000_fvh3pjaz / TS0012
    _TZ3000_owgcnkrh / TS0042
    _TZ3000_svoqrno4 / TS0002
    TUYATEC-O6SNCwd6 / TS0012
    _TYZB01_vzrytttn / TS0012 (MOES)
    _TZ3000_nta0gb8h / TS0002
    _TZ3000_lupfd8zu / TS0012
    _TZ3000_yhagrqmd / TS0002
    _TZ3000_5vujyute / TS0002
    _TYZB01_2athzhfr / TS0012
    _TZ3000_56bdyj21 / TS0002
    _TZ3000_e98krvvk / TS0012
    _TZ3000_atp7xmd9 / TS0002
    _TZ3000_mrqea2uu / TS0002
    _TZ3000_mklgayek / TS0002
    _TZ3000_p8alo7qa / TS0012
    _TYZB01_6g8b7at8 / TS0012
    TUYATEC-nzrrvgco / TS0012
    _TZ3000_qn8qvk9y / TS0002
    _TZ3000_s8r1qoyq / TS0012

- 3 Gang Wall Switch
    _TYZB01_xiuox57i / TS0013
    _TZ3000_a7ouggvs / TS0043
    _TYZB01_b8cr31hp / TS0003
    _TZ3000_wyhuocal / TS0013
    _TZ3000_cdamjqm9 / TS0003 (Zemismart ZM-L03E-Z)
    TYZB01_mqel1whf / TS0013
    _TZ3000_hlwm8e96 / TS0013
    _TZ3000_thhxrept / TS0003
    _TZ3000_2dlwlvex / TS0003
    _TZ3000_qcdqw8nf / TS0003
    _TZ3000_vvlivusi / TS0003
    _TZ3000_5e5ptb24 / TS0013
    _TZ3000_lrgccsxm / TS0013
    _TZ3000_w05exif3 / TS0003
    _TZ3000_qewo8dlz / TS0013
    _TZ3000_aezbqpcu / TS0013

- 4 Gang Wall Switch
     _TZ3000_r0pmi2p3 / TS0014
     _TZ3000_dku2cfsc / TS0044
     _TZ3000_fjt5218m / TS0044
     _TYZB01_bagt1e4o / TS0014 (Oz Smart Things)
    _TZE200_shkxsgis / TS0601
    _TZE204_aagrxlbd / TS0601
    _TZE200_aqnazj70 / TS0601
    _TZE200_di3tfv5b / TS0601
    _TZE200_mexisfik / TS0601
    _TZE204_6wi2mope / TS0601
    _TZE204_iik0pquw / TS0601

- 5 Gang Wall Switch
    _TZE200_jwsjbxjs / TS0601

- 6 Gang Wall Switch
    _TZE200_r731zlxk / TS0601
    _TZE200_9mahtqtg / TS0601

- Wall Dimmer
    _TZE200_3p5ydos3 / TS0601
    _TZE200_whpb9yts / TS0601
    _TZE200_ebwgzdqq / TS0601
    _TZE200_ctq0k47x / TS0601
    _TZE200_9i9dt8is / TS0601
    _TZE200_dfxkcots / TS0601
    _TZE200_w4cryh2i / TS0601
    _TZE200_ojzhk75b / TS0601
    _TZE200_9cxuhakf / TS0601
    _TZE200_a0syesf5 / TS0601
    _TZE200_swaamsoy / TS0601
    _TZE200_p0gzbqct / TS0601

**Lights**
- Christmas Tree Lights
    _TZE200_s8gkrkxk / TS0601 (Melinera / Lidl)

- Dimmable Recessed LED
    _TZ3210_zdrhqmo0 / TS0502B

- Dimmable LED Strip
    _TZ3210_invesber / TS0502B

- RGB LED Bar Light
    _TZ3000_gek6snaj / TS0505A (LIVARNO LUX / Lidl)
    _TZ3210_iystcadi / TS0505B (LIVARNO LUX / Lidl)

- RGB Bulb E14
    _TZ3000_odygigth / TS0505A (LIVARNO LUX / Lidl)

- RGB Bulb E27
    _TZ3000_dbou1ap4 / TS0505A (LIVARNO LUX / Lidl)
    _TZ3000_keabpigv / TS0505A (Woox)
    _TZ3000_12sxjap4 / TS0505B (YANDHI)
    _TZ3000_hlijwsai / TS0505A
    _TZ3000_qd7hej8u / TS0505B (LIVARNO LUX / Lidl)
    _TZ3210_mja6r5ix / TS0505B
    _TZ3000_q50zhdsc / TS0505B
    eWeLight / ZB-CL01 (Lonsonho)

- RGB Ceiling LED Light
    _TZ3210_x13bu7za / TS0505B (LIVARNO LUX / Lidl)

- RGB Floor LED Light
    _TZ3000_8uaoilu9 / TS0502A (LIVARNO LUX / Lidl)

- RGB Mood Light
    _TZ3000_9cpuaca6 / TS0505A (LIVARNO LUX / Lidl)
    _TZ3210_r0xgkft5 / TS0505B (LIVARNO LUX / Lidl)

- RGB LED Strip
    _TZ3000_riwp3k79 / TS0505A (LIVARNO LUX / Lidl)

- RGB LED Strip Controller
    _TZ3000_obacbukl / TS0503A
    _TZ3000_dl4pxp1r / TS0503A
    _TZ3000_qqjaziws / TS0505B
    _TZ3000_i8l0nqdu / TS0503B
    _TZ3000_ukuvyhaa / TS0504B
    _TZ3210_k1pe6ibm / TS0505B

- RGB Spot GU10
    _TZ3000_kdpxju99 / TS0505A (LIVARNO LUX / Lidl)

- RGB Spot GardenLight
   _TZ3000_h1jnz6l8 / TS0505A (LIVARNO LUX / Lidl)

- RGB Wall LED Light
    _TZ3000_utagpnzs / TS0505A
    _TZ3000_5bsf8vaj / TS0505A

- Tunable Bulb E14
    _TZ3000_oborybow / TS0502A (LIVARNO LUX / Lidl)

- Tunable Bulb E27
    _TZ3000_49qchf10 / TS0502A (LIVARNO LUX / Lidl)

- Tunable Spot GU10
    _TZ3000_el5kt5im / TS0502A (LIVARNO LUX / Lidl)

**Remotes**
- 1 Gang Wall Remote
    _TYZB02_keyjqthh / TS0041
    _TZ3000_tk3s5tyg / TS0041
    _TZ3000_fkp5zyho / TS0041
    _TZ3000_axpdxqgu / TS0041
    _TZ3000_peszejy7 / TS0041
    _TZ3000_pzui3skt / TS0041
    _TZ3000_f97vq5mn / TS0041
    _TZ3000_fa9mlvja / TS0041
    _TZ3000_itb0omhv / TS0041
    _TZ3000_8rppvwda / TS0041
    _TZ3000_4upl1fcj / TS0041
    _TZ3000_q68478x7 / TS0041

- 2 Gang Wall Remote
    _TZ3000_owgcnkrh / TS0042
    _TYZB02_keyjhapk / TS0042
    _TZ3000_oikiyf3b / TS0042
    _TZ3000_dfgbtub0 / TS0042
    _TZ3000_h1c2eamp / TS0042
    _TZ3400_keyjhapk / TS0042
    _TZ3000_5e235jpa / TS0042
    _TZ3000_fkvaniuu / TS0042

- 3 Gang Wall Remote
    _TZ3000_a7ouggvs / TS0043
    _TYZB02_key8kk7r / TS0043
    _TZ3000_qzjcsmar / TS0043
    _TZ3000_rrjr1q0u / TS0043
    _TZ3000_w8jwkczz / TS0043 (MOES)
    _TZ3000_gbm10jnj / TS0043 (MOES)
    _TZ3000_yw5tvzsk / TS0043
    _TZ3000_sj7jbgks / TS0043

- 4 Gang Wall Remote
    _TZ3000_vp6clf9d / TS0044
    _TZ3000_xabckq1v / TS004F (MOES)
    _TZ3000_wkai4ga5 / TS0044
    _TZ3000_ufhtxr59 / TS0044
    _TZ3000_ee8nrt2l / TS0044
    _TZ3000_uaa99arv / TS0044
    _TZ3000_a4xycprs / TS0044 (MOES)
    _TZ3000_jcspr0tp / TS0044
    _TZ3000_nuombroo / TS004F
    _TZ3000_czuyt8lz / TS004F
    _TZ3000_0ht8dnxj / TS004F
    _TZ3000_b3mgfu0d / TS004F
    _TZ3000_11pg3ima / TS004F
    _TZ3000_et7afzxz / TS004F

- 6 Gang Wall Remote
    _TZ3000_iszegwpd / TS0046

- 1 Button Smart Remote Controller
    _TZ3000_kjfzuycl / TS004F
    _TZ3000_rco1yzb1 / TS004F (Silvercrest / Lidl)
    _TZ3000_yirp2pgd / TS004F
    _TZ3000_fa9mlvja / TS0041
    _TZ3000_yj6k7vfo / TS0041
    _TZ3000_ja5osu5g / TS004F
    _TZ3000_qgwcxxws / TS0041

- 4 Button Smart Remote Controller
    _TZ3000_fsiepnrh / TS0215A (Nedis)
    _TYZB01_qm6djpta / TS0215A
    _TZ3000_p6ju8myv / TS0215A
    _TZ3000_u3nv1jwk / TS0044
    _TZ3000_eo3dttwe / TS0215A

- Knob Switch
    _TZ3000_abrsvsou / TS004F
    _TZ3000_4fjiwweb / TS004F
    _TZ3000_qja6nq5z / TS004F
    _TZ3000_ixla93vd / TS004F
    _TZ3000_uri7ongn / TS004F

**Curtains**
- Curtain Module
    _TZ3000_vd43bbfq / TS130F
    _TZ3000_ke7pzj5d / TS130F
    _TZ3000_fccpjz5z / TS130F
    _TZ3000_4uuaja4a / TS130F
    _TZ3000_zirycpws / TS130F
    _TZ3000_femsaaua / TS130F
    _TZ3000_e3vhyirx / TS130F (LoraTap SC500ZB)
    _TZ3000_1dd0d5yi / TS130F (MOES MS-108ZR)
    _TZ3000_jwv3cwak / TS130F
    _TZ3210_dwytrmda / TS130F (GIRIER)
    _TZ3210_ol1uhvza / TS130F (Lonsonho)
    _TZ3000_eg7awg6a / TS130F
    _TZ3000_eafaa66e / TS130F

- 2 Channel Curtain Module
    _TZ3000_j1xl73iw / TS130F
    _TZ3000_l6iqph4f / TS130F

- Curtain Motor
    _TZE200_5zbp6j0u / TS0601
    _TZE200_nkoabg8w / TS0601
    _TZE200_xuzcvlku / TS0601
    _TZE200_4vobcgd3 / TS0601
    _TZE200_nogaemzt / TS0601
    _TZE200_r0jdjrvi / TS0601
    _TZE200_pk0sfzvr / TS0601
    _TZE200_fdtjuw7u / TS0601
    _TZE200_zpzndjez / TS0601
    _TZE200_wmcdj3aq / TS0601
    _TZE200_cowvfni3 / TS0601
    _TZE200_rddyvrci / TS0601
    _TZE200_nueqqe6k / TS0601
    _TZE200_xaabybja / TS0601
    _TZE200_rmymn92d / TS0601
    _TZE200_3i3exuay / TS0601
    _TZE200_nogaemzt / TS0601
    _TZE200_zah67ekd / TS0601
    _TZE200_cowvfni3 / TS0601
    _TZE200_hsgrhjpf / TS0601
    _TZE200_pw7mji0l / TS0601
    _TZE200_68nvbio9 / TS0601
    _TZE200_bjzrowv2 / TS0601
    _TZE200_uj3f4wr5 / TS0601
    _TZE204_1fuxihti / TS0601
    _TZE200_axgvo9jh / TS0601
    _TZE200_gaj531w3 / TS0601
    _TZE200_yia0p3tr / TS0601
    _TZE200_nw1r9hp6 / TS0601
    _TZE200_cf1sl3tj / TS0601
    _TZE200_9p5xmj5r / TS0601
    _TZE204_xu4a5rhj / TS0601

- Wall mounted Curtain Switch
    _TZ3000_dph3rpss / TS130F
    _TZ3000_8kzqqzu4 / TS130F
    _TZ3000_ltiqubue / TS130F
    _TZ3000_dbpmpco1 / TS130F (Loratap, Model No SC400ZB, SC420ZB)
    _TZ3000_fvhunhxb / TS130F
    _TZ3000_ctbafvhm / TS130F
    _TZ3000_qqdbccb3 / TS130F
    _TZ3000_wptayaqr / TS130F (BSEED)
    _TZ3000_qa8s8vca / TS130F (Loratap)

**Other**
- Thermostatic Radiator Valves
    _TZE200_sur6q7ko / TS0601 (LSC Smart Connect)
    _TZE200_hue3yfsn / TS0601
    _TZE200_husqqvux / TS0601 (Tesla Smart)
    _TZE200_lnbfnyxd / TS0601 (Tesla Smart)
    _TZE200_lllliz3p / TS0601
    _TZE200_mudxchsu / TS0601
    _TZE200_7yoranx2 / TS0601 (MOES)
    _TZE200_e9ba97vf / TS0601 (MOES)
    _TZE200_kds0pmmv / TS0601 (MOES)
    _TZE200_kly8gjlz / TS0601
    _TZE200_py4cm3he / TS0601

- Wall Thermostat
    _TZE200_aoclfnxz / TS0601
    _TZE204_aoclfnxz / TS0601
    _TZE200_2ekuz3dz / TS0601

- Valve Controller
    _TYZB01_ymcdbl3u / TS0111
    _TZ3000_o4cjetlm / TS0001
    _TYZB01_4tlksk8a / TS0001
    _TZ3000_tvuarksa / TS011F
    _TZ3000_j9568h44 / TS0001
    _TZ3000_iedbgyxt / TS0001
    _TZ3000_w0ypwa1f / TS0001
    _TZ3000_5ucujjts / TS0001

- Smart Garden Irrigation Controller
    _TZ3210_eymunffl / TS0101 (Woox)
    _TZ3000_cjfmu5he / TS0049
    _TZ3000_kz1anoi8 / TS0049
    _TZ3000_mq4wujmp / TS0049

- Zigbee Repeater
    _TZ3000_m0vaazab / TS0207
    _TZ3000_5k5vh43t / TS0207
    _TZ3000_gszjt2xx / TS0207
    _TZ3000_ufttklsz / TS0207
    _TZ3000_nkkl7uzv / TS0207
    _TZ3000_nlsszmzl / TS0207
    _TZ3000_misw04hq / TS0207
    _TZ3000_wlquqiiz / TS0207

- 1 Channel Relay Board
    _TZ3000_g8n1n7lg / TS0001

- 2 Channel Relay Board
    _TZ3000_nuenzetq / TS0002
    _TZ3000_ruldv5dt / TS0002

- 4 Channel Relay Board
    _TZ3000_hdlpifbk / TS0004
    _TZ3000_excgg5kb / TS0004
    _TZ3000_u3oupgdy / TS0004
    _TZ3000_wkr3jqmr / TS0004
    _TZ3000_imaccztn / TS0004

- Smart Switch
    _TYZB01_phjeraqq / TS0001

- Siren
    _TZE200_d0yu2xgi / TS0601
    _TYST11_d0yu2xgi / TS0601
    _TZE204_t1blo2bj / TS0601

- Finger Bot
    _TZ3210_j4pdtz9v / TS0001 (MOES)
    _TZ3210_dse8ogfy / TS0001
    _TZ3210_232nryqh / TS0001
    _TZ3210_okbss9dy / TS0001

## Checking an unlisted device

A retail product name alone is not enough to determine compatibility. If a device is not listed, pair it as a generic Zigbee device and use Homey Developer Tools to obtain its Zigbee interview.

For a new-device request, include at least:

- `manufacturerName`
- `modelId` / `productId`
- endpoint IDs
- input/output clusters
- a link or photo identifying the retail product when available

New device requests belong in GitHub Issues.

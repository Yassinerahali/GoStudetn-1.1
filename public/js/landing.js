/* ═══════════════════════════════════════
       TRANSLATIONS
    ═══════════════════════════════════════ */
    const translations = {
      en: {
        nav_features:"Features", nav_how:"How it works", nav_loyalty:"Go Fidélité", nav_safety:"Safety",
        nav_login:"Log in", nav_start:"Get started →",
        hero_badge:"Now live across Morocco",
        hero_title_1:"Travel smarter,", hero_title_2:"travel ", hero_title_3:"together",
        hero_desc:"The ride-sharing platform built for Moroccan university students. Find trips, share costs, earn rewards — all in one place.",
        hero_cta1:"Book a Trip →", hero_cta2:"How it works",
        stat1:"Active students", stat2:"Moroccan cities", stat3:"Safety rating",
        badge_pts_label:"Points earned", badge_driver_label:"Verified driver", badge_confirmed:"Confirmed",
        card_title:"Available trip", card_tag:"Today · 14:30",
        from:"From", to:"To", seats:"3 seats left", trip_date:"Fri, 23 May", express:"Express",
        rides:"rides", per_seat:"/ seat", reserve:"Book a Trip",
        map_label:"Route coverage", map_title:"Connecting every Moroccan campus",
        map_desc:"From Tangier to Agadir, GoStudent covers the routes that matter most to university students.",
        feat_label:"Everything you need", feat_title:"Built for student life",
        feat_sub:"Every feature designed around the real needs of Moroccan university students.",
        f1_title:"Student-verified accounts", f1_desc:"All users are verified university students. Secure JWT authentication with role-based access for students and drivers.",
        f2_title:"Instant trip booking", f2_desc:"Browse available trips, filter by city and date, reserve a seat and get an instant confirmation — all in seconds.",
        f3_title:"Digital receipts", f3_desc:"Automatically generated PDF receipts for every booking with route details, driver info, price, and loyalty points earned.",
        f4_title:"Go Fidélité rewards", f4_desc:"Earn 1 point for every 50 DH spent. Redeem for free snacks, cafeteria meals, or entire trips. Your loyalty pays off.",
        f5_title:"Live route map", f5_desc:"Morocco-focused route visualization with animated paths, city markers, distance and duration estimates on every trip.",
        f6_title:"Pink Option", f6_desc:"A dedicated safety mode that filters trips to female drivers only — creating a more comfortable environment for female students.",
        loy_label:"Go Fidélité", loy_title:"Your rides<br>earn rewards",
        loy_sub:"Every dirham you spend on GoStudent brings you closer to a free trip, a meal, or a snack on campus.",
        r1_title:"Free campus snack", r1_desc:"Redeem at any partner university cafeteria",
        r2_title:"Free cafeteria meal", r2_desc:"Full lunch or dinner, your choice",
        r3_title:"Free trip", r3_desc:"Any available route, any date",
        pts_balance:"Your loyalty balance", gopoints:"GoPoints earned",
        pts_goal:"50 pts · Free trip", next_reward:"Next reward in", next_pts:"16 more points",
        free_trip:"Free trip", rate_label:"Rate", redeemed_label:"Redeemed", redeemed_val:"2 snacks",
        how_label:"Simple by design", how_title:"How GoStudent works",
        how_sub:"From sign-up to arrival, the whole process is built to be effortless.",
        s1_title:"Create your account", s1_desc:"Sign up as a student or driver. Verify your university status and set up your profile.",
        s2_title:"Find or post a trip", s2_desc:"Search available rides by route and date, or publish your own trip as a driver.",
        s3_title:"Reserve your seat", s3_desc:"Book in one tap. Your seat is instantly confirmed and your receipt is generated.",
        s4_title:"Earn & redeem", s4_desc:"Every trip earns GoPoints. Redeem them for snacks, meals, or your next free ride.",
        pink_badge:"Pink Option — Safety Mode",
        pink_title:"A safer ride<br>for every student",
        pink_desc:"GoStudent's Pink Option lets female students filter trips exclusively with female drivers — a dedicated space for safer, more comfortable travel.",
        sf1:"Female drivers only", sf2:"Verified identities", sf3:"Rating system", sf4:"Instant toggle",
        cta_title:"Ready to ride smarter?",
        cta_sub:"Join thousands of Moroccan students already saving money, earning rewards, and travelling together with GoStudent.",
        cta_student:"Start as a student →", cta_driver:"Become a driver", cta_note:"Free to join · No subscription · Pay per trip",
        footer_platform:"Platform", footer_account:"Account", footer_info:"Info",
        fp1:"Find a trip", fp2:"Publish a trip", fp3:"Go Fidélité", fp4:"Pink Option",
        fa1:"Sign up", fa2:"Log in", fa3:"Student dashboard", fa4:"Driver dashboard",
        fi1:"About us", fi2:"Safety", fi3:"Terms of service", fi4:"Privacy policy",
        footer_brand_desc:"The modern ride-sharing platform built for Moroccan university students. Travel together, spend less, earn more.",
        footer_made:"Made with", footer_for:"for Moroccan students.",
      },

      fr: {
        nav_features:"Fonctionnalités", nav_how:"Comment ça marche", nav_loyalty:"Go Fidélité", nav_safety:"Sécurité",
        nav_login:"Se connecter", nav_start:"Commencer →",
        hero_badge:"Disponible dans tout le Maroc",
        hero_title_1:"Voyagez plus malin,", hero_title_2:"voyagez ", hero_title_3:"ensemble",
        hero_desc:"La plateforme de covoiturage conçue pour les étudiants universitaires marocains. Trouvez des trajets, partagez les coûts, gagnez des récompenses.",
        hero_cta1:"Réserver un trajet →", hero_cta2:"Comment ça marche",
        stat1:"Étudiants actifs", stat2:"Villes marocaines", stat3:"Taux de sécurité",
        badge_pts_label:"Points gagnés", badge_driver_label:"Conducteur vérifié", badge_confirmed:"Confirmé",
        card_title:"Trajet disponible", card_tag:"Aujourd'hui · 14:30",
        from:"Départ", to:"Arrivée", seats:"3 places restantes", trip_date:"Ven, 23 Mai", express:"Express",
        rides:"trajets", per_seat:"/ siège", reserve:"Réserver un trajet",
        map_label:"Couverture des routes", map_title:"Connecter chaque campus marocain",
        map_desc:"De Tanger à Agadir, GoStudent couvre les routes les plus importantes pour les étudiants universitaires.",
        feat_label:"Tout ce dont vous avez besoin", feat_title:"Conçu pour la vie étudiante",
        feat_sub:"Chaque fonctionnalité pensée pour les besoins réels des étudiants marocains.",
        f1_title:"Comptes vérifiés", f1_desc:"Tous les utilisateurs sont des étudiants universitaires vérifiés. Authentification JWT sécurisée avec accès basé sur les rôles.",
        f2_title:"Réservation instantanée", f2_desc:"Parcourez les trajets disponibles, filtrez par ville et date, réservez une place et obtenez une confirmation immédiate.",
        f3_title:"Reçus numériques", f3_desc:"Reçus PDF générés automatiquement pour chaque réservation avec les détails du trajet, informations sur le conducteur et points fidélité.",
        f4_title:"Récompenses Go Fidélité", f4_desc:"Gagnez 1 point pour chaque 50 DH dépensés. Échangez contre des snacks gratuits, repas à la cafétéria ou des trajets entiers.",
        f5_title:"Carte des routes en direct", f5_desc:"Visualisation des routes centrée sur le Maroc avec des chemins animés, marqueurs de villes et estimations de distance.",
        f6_title:"Option Rose", f6_desc:"Un mode de sécurité dédié qui filtre les trajets vers les conductrices uniquement — un espace plus confortable pour les étudiantes.",
        loy_label:"Go Fidélité", loy_title:"Vos trajets<br>vous récompensent",
        loy_sub:"Chaque dirham dépensé sur GoStudent vous rapproche d'un trajet gratuit, d'un repas ou d'un snack sur le campus.",
        r1_title:"Snack campus gratuit", r1_desc:"À utiliser dans toute cafétéria universitaire partenaire",
        r2_title:"Repas cafétéria gratuit", r2_desc:"Déjeuner ou dîner complet, à votre choix",
        r3_title:"Trajet gratuit", r3_desc:"Toute route disponible, à toute date",
        pts_balance:"Votre solde fidélité", gopoints:"GoPoints gagnés",
        pts_goal:"50 pts · Trajet gratuit", next_reward:"Prochaine récompense dans", next_pts:"16 points de plus",
        free_trip:"Trajet gratuit", rate_label:"Taux", redeemed_label:"Utilisés", redeemed_val:"2 snacks",
        how_label:"Simple par conception", how_title:"Comment fonctionne GoStudent",
        how_sub:"De l'inscription à l'arrivée, tout le processus est conçu pour être sans effort.",
        s1_title:"Créez votre compte", s1_desc:"Inscrivez-vous en tant qu'étudiant ou conducteur. Vérifiez votre statut universitaire et configurez votre profil.",
        s2_title:"Trouvez ou publiez un trajet", s2_desc:"Recherchez des trajets disponibles par itinéraire et date, ou publiez votre propre trajet en tant que conducteur.",
        s3_title:"Réservez votre place", s3_desc:"Réservez en un clic. Votre siège est immédiatement confirmé et votre reçu est généré.",
        s4_title:"Gagnez et échangez", s4_desc:"Chaque trajet vous rapporte des GoPoints. Échangez-les contre des snacks, repas ou votre prochain trajet gratuit.",
        pink_badge:"Option Rose — Mode Sécurité",
        pink_title:"Un trajet plus sûr<br>pour chaque étudiant(e)",
        pink_desc:"L'Option Rose de GoStudent permet aux étudiantes de filtrer les trajets uniquement avec des conductrices — un espace dédié pour des voyages plus confortables.",
        sf1:"Conductrices uniquement", sf2:"Identités vérifiées", sf3:"Système de notation", sf4:"Activation instantanée",
        cta_title:"Prêt(e) à voyager plus malin ?",
        cta_sub:"Rejoignez des milliers d'étudiants marocains qui économisent, gagnent des récompenses et voyagent ensemble avec GoStudent.",
        cta_student:"Commencer en tant qu'étudiant →", cta_driver:"Devenir conducteur", cta_note:"Inscription gratuite · Sans abonnement · Payez par trajet",
        footer_platform:"Plateforme", footer_account:"Compte", footer_info:"Infos",
        fp1:"Trouver un trajet", fp2:"Publier un trajet", fp3:"Go Fidélité", fp4:"Option Rose",
        fa1:"S'inscrire", fa2:"Se connecter", fa3:"Tableau étudiant", fa4:"Tableau conducteur",
        fi1:"À propos", fi2:"Sécurité", fi3:"Conditions d'utilisation", fi4:"Politique de confidentialité",
        footer_brand_desc:"La plateforme de covoiturage moderne conçue pour les étudiants universitaires marocains. Voyagez ensemble, dépensez moins, gagnez plus.",
        footer_made:"Fait avec", footer_for:"pour les étudiants marocains.",
      },

      ar: {
        nav_features:"المميزات", nav_how:"كيف يعمل", nav_loyalty:"برنامج الولاء", nav_safety:"الأمان",
        nav_login:"تسجيل الدخول", nav_start:"ابدأ الآن ←",
        hero_badge:"متاح الآن في جميع أنحاء المغرب",
        hero_title_1:"سافر بذكاء،", hero_title_2:"سافر ", hero_title_3:"معًا",
        hero_desc:"منصة مشاركة الرحلات المصممة خصيصًا لطلاب الجامعات المغربية. ابحث عن رحلات، شارك التكاليف، واكسب مكافآت — كل ذلك في مكان واحد.",
        hero_cta1:"احجز رحلة ←", hero_cta2:"كيف يعمل",
        stat1:"طالب نشط", stat2:"مدينة مغربية", stat3:"معدل السلامة",
        badge_pts_label:"نقاط مكتسبة", badge_driver_label:"سائق موثق", badge_confirmed:"مؤكد",
        card_title:"رحلة متاحة", card_tag:"اليوم · 14:30",
        from:"من", to:"إلى", seats:"3 مقاعد متبقية", trip_date:"جمعة، 23 مايو", express:"سريع",
        rides:"رحلة", per_seat:"/ مقعد", reserve:"احجز رحلة",
        map_label:"تغطية المسارات", map_title:"نربط كل حرم جامعي مغربي",
        map_desc:"من طنجة إلى أكادير، تغطي GoStudent أهم المسارات لطلاب الجامعات المغربية.",
        feat_label:"كل ما تحتاجه", feat_title:"مصمم لحياة الطالب",
        feat_sub:"كل ميزة مصممة حول الاحتياجات الحقيقية للطلاب الجامعيين المغاربة.",
        f1_title:"حسابات موثقة للطلاب", f1_desc:"جميع المستخدمين طلاب جامعيون موثقون. مصادقة JWT آمنة مع وصول قائم على الأدوار للطلاب والسائقين.",
        f2_title:"حجز فوري للرحلات", f2_desc:"تصفح الرحلات المتاحة، فلتر حسب المدينة والتاريخ، احجز مقعدًا واحصل على تأكيد فوري — في ثوانٍ.",
        f3_title:"إيصالات رقمية", f3_desc:"إيصالات PDF تُنشأ تلقائيًا لكل حجز مع تفاصيل المسار ومعلومات السائق والسعر ونقاط الولاء.",
        f4_title:"مكافآت Go Fidélité", f4_desc:"اكسب نقطة واحدة لكل 50 درهم مغربي تنفقه. استبدلها بوجبات خفيفة مجانية أو وجبات المطعم أو رحلات كاملة.",
        f5_title:"خريطة المسار المباشر", f5_desc:"تصور المسارات يركز على المغرب مع مسارات متحركة وعلامات المدن وتقديرات المسافة والمدة لكل رحلة.",
        f6_title:"الخيار الوردي", f6_desc:"وضع أمان مخصص يفلتر الرحلات لتكون مع السائقات فقط — مما يوفر بيئة أكثر راحة للطالبات.",
        loy_label:"برنامج Go Fidélité", loy_title:"رحلاتك<br>تكسبك مكافآت",
        loy_sub:"كل درهم تنفقه على GoStudent يقربك من رحلة مجانية أو وجبة أو وجبة خفيفة في الحرم الجامعي.",
        r1_title:"وجبة خفيفة مجانية", r1_desc:"استبدل في أي مطعم جامعي شريك",
        r2_title:"وجبة مطعم مجانية", r2_desc:"غداء أو عشاء كامل، اختيارك",
        r3_title:"رحلة مجانية", r3_desc:"أي مسار متاح، أي تاريخ",
        pts_balance:"رصيد الولاء الخاص بك", gopoints:"نقاط GoPoints المكتسبة",
        pts_goal:"50 نقطة · رحلة مجانية", next_reward:"المكافأة التالية خلال", next_pts:"16 نقطة أخرى",
        free_trip:"رحلة مجانية", rate_label:"المعدل", redeemed_label:"المستبدل", redeemed_val:"وجبتان خفيفتان",
        how_label:"بسيط بالتصميم", how_title:"كيف تعمل GoStudent",
        how_sub:"من التسجيل حتى الوصول، كل العملية مصممة لتكون سلسة وبسيطة.",
        s1_title:"أنشئ حسابك", s1_desc:"سجل كطالب أو سائق. تحقق من حالتك الجامعية وأعد ملف تعريفك.",
        s2_title:"ابحث أو انشر رحلة", s2_desc:"ابحث عن رحلات متاحة حسب المسار والتاريخ، أو انشر رحلتك الخاصة كسائق.",
        s3_title:"احجز مقعدك", s3_desc:"احجز بنقرة واحدة. يُؤكد مقعدك فورًا ويُنشئ إيصالك تلقائيًا.",
        s4_title:"اكسب واستبدل", s4_desc:"كل رحلة تكسبك نقاط GoPoints. استبدلها بوجبات خفيفة أو وجبات أو رحلتك المجانية التالية.",
        pink_badge:"الخيار الوردي — وضع الأمان",
        pink_title:"رحلة أكثر أمانًا<br>لكل طالبة",
        pink_desc:"يتيح الخيار الوردي من GoStudent للطالبات تصفية الرحلات مع السائقات حصريًا — مساحة مخصصة للسفر الآمن والمريح.",
        sf1:"السائقات فقط", sf2:"هويات موثقة", sf3:"نظام التقييم", sf4:"تفعيل فوري",
        cta_title:"هل أنت مستعد للسفر بذكاء؟",
        cta_sub:"انضم إلى آلاف الطلاب المغاربة الذين يوفرون المال ويكسبون المكافآت ويسافرون معًا مع GoStudent.",
        cta_student:"ابدأ كطالب ←", cta_driver:"كن سائقًا", cta_note:"التسجيل مجاني · لا اشتراك · ادفع لكل رحلة",
        footer_platform:"المنصة", footer_account:"الحساب", footer_info:"معلومات",
        fp1:"ابحث عن رحلة", fp2:"انشر رحلة", fp3:"برنامج الولاء", fp4:"الخيار الوردي",
        fa1:"إنشاء حساب", fa2:"تسجيل الدخول", fa3:"لوحة الطالب", fa4:"لوحة السائق",
        fi1:"من نحن", fi2:"الأمان", fi3:"شروط الخدمة", fi4:"سياسة الخصوصية",
        footer_brand_desc:"منصة مشاركة الرحلات الحديثة المصممة للطلاب الجامعيين المغاربة. سافروا معًا، أنفقوا أقل، اكسبوا أكثر.",
        footer_made:"صُنع بـ", footer_for:"لطلاب المغرب.",
      }
    };

    let currentLang = 'en';

    const applyPinkOption = () => {
      document.body.classList.toggle('option-pink', localStorage.getItem('goStudentPinkMode') === 'on');
    };

    applyPinkOption();

    function setLang(lang) {
      currentLang = lang;
      const html = document.documentElement;
      const t = translations[lang];

      // Set lang + dir attributes
      html.setAttribute('lang', lang);
      html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

      // Update all data-i18n elements
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key] !== undefined) el.innerHTML = t[key];
      });

      // Update active lang button
      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        const map = { en:'EN', fr:'FR', ar:'ع' };
        if (btn.textContent.trim() === map[lang]) btn.classList.add('active');
      });

      // Flip trip city alignment for RTL
      const rightCity = document.querySelector('.trip-route .trip-city:last-child');
      if (rightCity) rightCity.style.textAlign = lang === 'ar' ? 'left' : 'right';

      // Update page title
      const titles = { en:'GoStudent — Ride Sharing for Moroccan Students', fr:'GoStudent — Covoiturage pour Étudiants Marocains', ar:'GoStudent — مشاركة الرحلات للطلاب المغاربة' };
      document.title = titles[lang];
    }

    /* ── Scroll & Intersection ── */
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
      const shadowColor = document.body.classList.contains('option-pink')
        ? 'rgba(233,30,140,.12)'
        : 'rgba(12,68,124,.1)';
      nav.style.boxShadow = window.scrollY > 20 ? `0 4px 24px ${shadowColor}` : '';
    });

    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior:'smooth' }); }
      });
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.feature-card, .step, .reward-item').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity .5s ease, transform .5s ease';
      observer.observe(el);
    });

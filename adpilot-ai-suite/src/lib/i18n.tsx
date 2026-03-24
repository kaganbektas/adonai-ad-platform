import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Lang = "en" | "tr";

const translations = {
  // ==================== NAVBAR ====================
  "nav.features": { en: "Features", tr: "Neler Yapabiliriz" },
  "nav.howItWorks": { en: "How It Works", tr: "Nasıl Çalışır" },
  "nav.pricing": { en: "Pricing", tr: "Fiyatlandırma" },
  "nav.signIn": { en: "Sign In", tr: "Giriş Yap" },
  "nav.getStarted": { en: "Get Started Free", tr: "Ücretsiz Başla" },

  // ==================== HERO ====================
  "hero.tagline": { en: "AI-Powered Marketing Automation", tr: "Yapay Zekâ Destekli Pazarlama Otomasyonu" },
  "hero.title1": { en: "Your AI", tr: "Yapay Zekâ" },
  "hero.title2": { en: "Marketing Team", tr: "Pazarlama Ekibin" },
  "hero.desc": {
    en: "Enter your website URL. Our AI agents analyze your brand, find competitors, generate ad creatives, and build your marketing strategy — in minutes, not months.",
    tr: "Web siteni gir, gerisini bize bırak. Yapay zekâ ajanlarımız markayı analiz etsin, rakipleri bulsun, reklam görselleri üretsin ve pazarlama stratejini oluştursun — aylarca değil, dakikalar içinde."
  },
  "hero.cta": { en: "Analyze My Brand", tr: "Markamı Analiz Et" },
  "hero.noCreditCard": { en: "No credit card required. Free analysis.", tr: "Kredi kartı gerekmez. İlk analiz ücretsiz." },

  // ==================== SOCIAL PROOF ====================
  "social.rating": {
    en: "Rated 4.9/5 by marketing teams. Trusted by 500+ brands.",
    tr: "Pazarlama ekiplerinden 4.9/5 puan. 500'den fazla markanın tercihi."
  },

  // ==================== HOW IT WORKS ====================
  "how.label": { en: "Process", tr: "Süreç" },
  "how.title": { en: "From URL to Full Strategy in 3 Steps", tr: "3 Adımda URL'den Stratejiye" },
  "how.step1.title": { en: "Enter Your URL", tr: "Web Siteni Gir" },
  "how.step1.desc": { en: "Just paste your website address. Our AI does the rest.", tr: "Sadece web adresini yapıştır. Yapay zekâ geri kalanını halleder." },
  "how.step2.title": { en: "AI Agents Get to Work", tr: "Yapay Zekâ Ajanları Devreye Girer" },
  "how.step2.desc": {
    en: "Brand analysis, competitor research, trend discovery, ad creation — all automated.",
    tr: "Marka analizi, rakip araştırması, trend keşfi, reklam üretimi — hepsi otomatik."
  },
  "how.step3.title": { en: "Get Your Results", tr: "Sonuçlarını Al" },
  "how.step3.desc": {
    en: "Professional reports, ready-to-use ad creatives, and an actionable marketing plan.",
    tr: "Profesyonel raporlar, kullanıma hazır reklam görselleri ve uygulanabilir bir pazarlama planı."
  },

  // ==================== FEATURES ====================
  "features.label": { en: "Capabilities", tr: "Yetenekler" },
  "features.title": { en: "Everything a Marketing Team Does. One Platform.", tr: "Bir Pazarlama Ekibinin Yaptığı Her Şey. Tek Platform." },
  "features.brandIntel.title": { en: "Brand Intelligence", tr: "Marka Zekâsı" },
  "features.brandIntel.desc": {
    en: "AI analyzes your website to understand your brand, tone, audience, and unique selling points.",
    tr: "Yapay zekâ, markayı anlamak için web siteni analiz eder — marka tonu, hedef kitle ve farklılaştıran noktaları keşfeder."
  },
  "features.competitor.title": { en: "Competitor Analysis", tr: "Rakip Analizi" },
  "features.competitor.desc": {
    en: "Automatically discovers your competitors, analyzes their ads, and finds gaps you can exploit.",
    tr: "Rakiplerini otomatik bulur, reklamlarını analiz eder ve senin kullanabileceğin boşlukları tespit eder."
  },
  "features.adEngine.title": { en: "Ad Creative Engine", tr: "Reklam Üretim Motoru" },
  "features.adEngine.desc": {
    en: "Generates headlines, descriptions, and ready-to-use ad visuals across multiple formats.",
    tr: "Farklı formatlarda başlık, açıklama ve kullanıma hazır reklam görselleri üretir."
  },
  "features.trend.title": { en: "Trend Discovery", tr: "Trend Keşfi" },
  "features.trend.desc": {
    en: "Identifies what's working in your industry — emotional triggers, seasonal opportunities, winning angles.",
    tr: "Sektöründe neyin işe yaradığını keşfeder — duygusal tetikleyiciler, mevsimsel fırsatlar, kazandıran açılar."
  },
  "features.benchmark.title": { en: "Performance Benchmarks", tr: "Performans Karşılaştırması" },
  "features.benchmark.desc": {
    en: "Compares your metrics against industry averages. Know where you stand and what to improve.",
    tr: "Metriklerini sektör ortalamalarıyla karşılaştırır. Nerede olduğunu ve neyi geliştirmen gerektiğini gösterir."
  },
  "features.reports.title": { en: "Smart Reports", tr: "Akıllı Raporlar" },
  "features.reports.desc": {
    en: "Professional PDF reports with insights, action plans, and ad previews — ready to share.",
    tr: "İçgörüler, aksiyon planları ve reklam önizlemeleri içeren profesyonel PDF raporları — hemen paylaşmaya hazır."
  },

  // ==================== AGENT SHOWCASE ====================
  "agents.label": { en: "AI Agents", tr: "Yapay Zekâ Ajanları" },
  "agents.title": { en: "Meet Your AI Marketing Agents", tr: "Yapay Zekâ Pazarlama Ekibinle Tanış" },
  "agents.active": { en: "Active 24/7", tr: "7/24 Aktif" },
  "agents.brand.name": { en: "Brand Analyst", tr: "Marka Analisti" },
  "agents.brand.desc": { en: "Analyzes your website and brand positioning", tr: "Web siteni ve marka konumlandırmanı analiz eder" },
  "agents.competitor.name": { en: "Competitor Intel", tr: "Rakip İstihbaratı" },
  "agents.competitor.desc": { en: "Monitors competitor advertising strategies", tr: "Rakip reklam stratejilerini izler" },
  "agents.creative.name": { en: "Creative Director", tr: "Kreatif Direktör" },
  "agents.creative.desc": { en: "Generates ad copy and visual creatives", tr: "Reklam metinleri ve görselleri üretir" },
  "agents.trend.name": { en: "Trend Analyst", tr: "Trend Analisti" },
  "agents.trend.desc": { en: "Discovers industry trends and opportunities", tr: "Sektör trendlerini ve fırsatları keşfeder" },
  "agents.perf.name": { en: "Performance Analyst", tr: "Performans Analisti" },
  "agents.perf.desc": { en: "Benchmarks and evaluates campaign metrics", tr: "Kampanya metriklerini karşılaştırır ve değerlendirir" },
  "agents.report.name": { en: "Report Generator", tr: "Rapor Üretici" },
  "agents.report.desc": { en: "Compiles everything into professional reports", tr: "Her şeyi profesyonel raporlara dönüştürür" },

  // ==================== PRICING ====================
  "pricing.label": { en: "Pricing", tr: "Fiyatlandırma" },
  "pricing.title": { en: "Simple, Transparent Pricing", tr: "Basit ve Şeffaf Fiyatlandırma" },
  "pricing.trial": {
    en: "All plans include a 14-day free trial. No credit card required.",
    tr: "Tüm planlarda 14 gün ücretsiz deneme. Kredi kartı gerekmez."
  },
  "pricing.starter": { en: "Starter", tr: "Başlangıç" },
  "pricing.pro": { en: "Pro", tr: "Pro" },
  "pricing.enterprise": { en: "Enterprise", tr: "Kurumsal" },
  "pricing.popular": { en: "Popular", tr: "Popüler" },
  "pricing.custom": { en: "Custom", tr: "Özel" },
  "pricing.mo": { en: "/mo", tr: "/ay" },
  "pricing.startTrial": { en: "Start Free Trial", tr: "Ücretsiz Dene" },
  "pricing.contactSales": { en: "Contact Sales", tr: "Satışa Ulaş" },
  // Starter features
  "pricing.f.brandAnalyses5": { en: "5 brand analyses/month", tr: "Aylık 5 marka analizi" },
  "pricing.f.basicCompetitor": { en: "Basic competitor analysis", tr: "Temel rakip analizi" },
  "pricing.f.creatives50": { en: "50 ad creatives/month", tr: "Aylık 50 reklam görseli" },
  "pricing.f.emailReports": { en: "Email reports", tr: "E-posta ile rapor" },
  // Pro features
  "pricing.f.unlimitedBrand": { en: "Unlimited brand analyses", tr: "Sınırsız marka analizi" },
  "pricing.f.deepCompetitor": { en: "Deep competitor intelligence", tr: "Derinlemesine rakip istihbaratı" },
  "pricing.f.creatives500": { en: "500 ad creatives/month", tr: "Aylık 500 reklam görseli" },
  "pricing.f.trendAnalysis": { en: "Trend analysis", tr: "Trend analizi" },
  "pricing.f.pdfReports": { en: "PDF reports", tr: "PDF raporlar" },
  "pricing.f.prioritySupport": { en: "Priority support", tr: "Öncelikli destek" },
  // Enterprise features
  "pricing.f.everythingPro": { en: "Everything in Pro", tr: "Pro'daki her şey" },
  "pricing.f.apiAccess": { en: "API access", tr: "API erişimi" },
  "pricing.f.whiteLabel": { en: "White-label reports", tr: "Markalı raporlar" },
  "pricing.f.customTemplates": { en: "Custom templates", tr: "Özel şablonlar" },
  "pricing.f.dedicatedManager": { en: "Dedicated account manager", tr: "Özel hesap yöneticisi" },

  // ==================== CTA ====================
  "cta.title": { en: "Ready to put your marketing on autopilot?", tr: "Pazarlamanı otopilota almaya hazır mısın?" },
  "cta.subtitle": { en: "Start with your website URL. Results in minutes.", tr: "Web siteni gir, sonuçları dakikalar içinde al." },
  "cta.button": { en: "Get Started Free", tr: "Ücretsiz Başla" },

  // ==================== FOOTER ====================
  "footer.tagline": {
    en: "Your AI marketing team. From URL to full strategy in minutes.",
    tr: "Yapay zekâ pazarlama ekibin. URL'den komple stratejiye, dakikalar içinde."
  },
  "footer.product": { en: "Product", tr: "Ürün" },
  "footer.company": { en: "Company", tr: "Şirket" },
  "footer.resources": { en: "Resources", tr: "Kaynaklar" },
  "footer.legal": { en: "Legal", tr: "Yasal" },
  "footer.features": { en: "Features", tr: "Özellikler" },
  "footer.pricing": { en: "Pricing", tr: "Fiyatlandırma" },
  "footer.integrations": { en: "Integrations", tr: "Entegrasyonlar" },
  "footer.changelog": { en: "Changelog", tr: "Değişiklikler" },
  "footer.about": { en: "About", tr: "Hakkımızda" },
  "footer.blog": { en: "Blog", tr: "Blog" },
  "footer.careers": { en: "Careers", tr: "Kariyer" },
  "footer.press": { en: "Press", tr: "Basın" },
  "footer.docs": { en: "Documentation", tr: "Dokümantasyon" },
  "footer.help": { en: "Help Center", tr: "Yardım Merkezi" },
  "footer.apiRef": { en: "API Reference", tr: "API Referansı" },
  "footer.status": { en: "Status", tr: "Durum" },
  "footer.privacy": { en: "Privacy", tr: "Gizlilik" },
  "footer.terms": { en: "Terms", tr: "Koşullar" },
  "footer.security": { en: "Security", tr: "Güvenlik" },
  "footer.gdpr": { en: "GDPR", tr: "KVKK" },
  "footer.copyright": { en: "\u00a9 2026 ADONAI. All rights reserved.", tr: "\u00a9 2026 ADONAI. Tüm hakları saklıdır." },

  // ==================== AUTH (SPLIT LAYOUT) ====================
  "auth.loginTab": { en: "LOGIN", tr: "GİRİŞ" },
  "auth.registerTab": { en: "REGISTER", tr: "KAYIT OL" },
  "auth.welcomeBack": { en: "Welcome back.", tr: "Tekrar hoş geldin." },
  "auth.welcomeDesc": { en: "Enter your credentials to access your dashboard.", tr: "Paneline erişmek için bilgilerini gir." },
  "auth.createAccount": { en: "Create your account.", tr: "Hesabını oluştur." },
  "auth.createDesc": { en: "Start your free 14-day trial today.", tr: "14 günlük ücretsiz denemeyi başlat." },
  "auth.emailLabel": { en: "EMAIL ADDRESS", tr: "E-POSTA ADRESİ" },
  "auth.passwordLabel": { en: "PASSWORD", tr: "ŞİFRE" },
  "auth.nameLabel": { en: "FULL NAME", tr: "AD SOYAD" },
  "auth.forgot": { en: "FORGOT?", tr: "UNUTTUM?" },
  "auth.continue": { en: "CONTINUE", tr: "DEVAM ET" },
  "auth.or": { en: "OR", tr: "VEYA" },
  "auth.google": { en: "Continue with Google", tr: "Google ile Devam Et" },
  "auth.terms": { en: "BY CLICKING CONTINUE, YOU AGREE TO OUR", tr: "DEVAM EDEREK," },
  "auth.termsOf": { en: "TERMS OF SERVICE", tr: "HİZMET KOŞULLARI" },
  "auth.and": { en: "AND", tr: "VE" },
  "auth.privacy": { en: "PRIVACY POLICY", tr: "GİZLİLİK POLİTİKASI" },
  "auth.termsEnd": { en: ".", tr: "'NI KABUL EDERSİNİZ." },
  "auth.backToWebsite": { en: "BACK TO WEBSITE", tr: "SİTEYE DÖN" },
  "auth.rightTitle": { en: "Access the\nIntelligence.", tr: "Zekâya\nEriş." },
  "auth.rightDesc": { en: "Scale your marketing operations with an autonomous workforce powered by the next generation of artificial intelligence.", tr: "Pazarlama operasyonlarını, yeni nesil yapay zekâ ile güçlendirilmiş otonom bir iş gücüyle ölçeklendir." },
  "auth.feature1.title": { en: "Your AI Marketing Team", tr: "Yapay Zekâ Pazarlama Ekibin" },
  "auth.feature1.desc": { en: "24/7 autonomous management of your entire marketing stack.", tr: "Tüm pazarlama yığınının 7/24 otonom yönetimi." },
  "auth.feature2.title": { en: "Autonomous Ad Generation", tr: "Otonom Reklam Üretimi" },
  "auth.feature2.desc": { en: "From creative copy to visual assets, generated and deployed in real-time.", tr: "Yaratıcı metinden görsel varlıklara, gerçek zamanlı üretim ve dağıtım." },
  "auth.feature3.title": { en: "Enterprise-Grade Security", tr: "Kurumsal Güvenlik" },
  "auth.feature3.desc": { en: "Your data is siloed, encrypted, and never used to train public models.", tr: "Verilerin izole, şifreli ve asla genel modelleri eğitmek için kullanılmaz." },
  "auth.trustedBy": { en: "TRUSTED BY 2,000+ FORWARD-THINKING BRANDS", tr: "2.000+ YENİLİKÇİ MARKANIN TERCİHİ" },
  "auth.copyright": { en: "© 2024 ADONAI AI. ALL RIGHTS RESERVED.", tr: "© 2024 ADONAI AI. TÜM HAKLARI SAKLIDIR." },

  // ==================== LOGIN (legacy keys) ====================
  "login.title": { en: "Sign In", tr: "Giriş Yap" },
  "login.desc": { en: "Enter your credentials to continue", tr: "Devam etmek için bilgilerini gir" },
  "login.email": { en: "Email", tr: "E-posta" },
  "login.password": { en: "Password", tr: "Şifre" },
  "login.submit": { en: "Sign In", tr: "Giriş Yap" },
  "login.or": { en: "or", tr: "veya" },
  "login.google": { en: "Continue with Google", tr: "Google ile Devam Et" },
  "login.noAccount": { en: "Don't have an account?", tr: "Hesabın yok mu?" },
  "login.signUp": { en: "Sign Up", tr: "Kayıt Ol" },

  // ==================== REGISTER ====================
  "register.title": { en: "Create Account", tr: "Hesap Oluştur" },
  "register.desc": { en: "Start your free 14-day trial", tr: "14 günlük ücretsiz denemeyi başlat" },
  "register.name": { en: "Full Name", tr: "Ad Soyad" },
  "register.email": { en: "Email", tr: "E-posta" },
  "register.password": { en: "Password", tr: "Şifre" },
  "register.submit": { en: "Get Started Free", tr: "Ücretsiz Başla" },
  "register.or": { en: "or", tr: "veya" },
  "register.google": { en: "Continue with Google", tr: "Google ile Devam Et" },
  "register.hasAccount": { en: "Already have an account?", tr: "Zaten hesabın var mı?" },
  "register.signIn": { en: "Sign In", tr: "Giriş Yap" },

  // ==================== DASHBOARD ====================
  "dash.welcome": { en: "Welcome back, Alex", tr: "Tekrar hoş geldin, Alex" },
  "dash.dashboard": { en: "Dashboard", tr: "Kontrol Paneli" },
  "dash.analyses": { en: "Analyses", tr: "Analizler" },
  "dash.adCreatives": { en: "Ad Creatives", tr: "Reklam Görselleri" },
  "dash.reports": { en: "Reports", tr: "Raporlar" },
  "dash.settings": { en: "Settings", tr: "Ayarlar" },

  // Dashboard Home
  "dash.startNew": { en: "Start New Analysis", tr: "Yeni Analiz Başlat" },
  "dash.pasteUrl": { en: "Paste a website URL to analyze", tr: "Analiz etmek istediğin web sitesini yapıştır" },
  "dash.chooseSource": { en: "Choose your data source and start analyzing", tr: "Veri kaynağını seç ve analiz etmeye başla" },
  "dash.sourceUrl": { en: "Website URL", tr: "Web Sitesi" },
  "dash.sourceCsv": { en: "CSV Upload", tr: "CSV Yükle" },
  "dash.uploadCsv": { en: "Click to upload CSV file...", tr: "CSV dosyası yüklemek için tıkla..." },
  "dash.sectorOptional": { en: "Sector (optional)", tr: "Sektör (isteğe bağlı)" },
  "dash.analyze": { en: "Analyze", tr: "Analiz Et" },
  "dash.totalAnalyses": { en: "Total Analyses", tr: "Toplam Analiz" },
  "dash.adCreativesCount": { en: "Ad Creatives", tr: "Reklam Görseli" },
  "dash.reportsCreated": { en: "Reports Created", tr: "Oluşturulan Rapor" },
  "dash.competitorsTracked": { en: "Competitors Tracked", tr: "Takip Edilen Rakip" },
  "dash.recentAnalyses": { en: "Recent Analyses", tr: "Son Analizler" },
  "dash.completed": { en: "Completed", tr: "Tamamlandı" },
  "dash.inProgress": { en: "In Progress", tr: "Devam Ediyor" },

  // Analyses List
  "dash.allAnalyses": { en: "All Analyses", tr: "Tüm Analizler" },

  // Analysis Running
  "dash.analysisInProgress": { en: "Analysis in progress", tr: "Analiz devam ediyor" },
  "dash.step.fetch": { en: "Fetching website content...", tr: "Web sitesi içeriği çekiliyor..." },
  "dash.step.brand": { en: "Analyzing brand identity...", tr: "Marka kimliği analiz ediliyor..." },
  "dash.step.competitors": { en: "Discovering competitors...", tr: "Rakipler tespit ediliyor..." },
  "dash.step.trends": { en: "Analyzing trends...", tr: "Trendler analiz ediliyor..." },
  "dash.step.creatives": { en: "Generating ad creatives...", tr: "Reklam görselleri üretiliyor..." },
  "dash.step.report": { en: "Building your report...", tr: "Raporun hazırlanıyor..." },
  "dash.aiTip": {
    en: "AI can analyze your competitors 100x faster than a human team. We're scanning thousands of data points right now.",
    tr: "Yapay zekâ, rakiplerini bir insan ekibinden 100 kat hızlı analiz edebilir. Şu anda binlerce veri noktasını tarıyoruz."
  },

  // Analysis Results
  "results.brand": { en: "Brand", tr: "Marka" },
  "results.competitors": { en: "Competitors", tr: "Rakipler" },
  "results.trends": { en: "Trends", tr: "Trendler" },
  "results.adCreatives": { en: "Ad Creatives", tr: "Reklam Görselleri" },
  "results.report": { en: "Report", tr: "Rapor" },
  "results.businessType": { en: "Business Type", tr: "İşletme Türü" },
  "results.brandTone": { en: "Brand Tone", tr: "Marka Tonu" },
  "results.formal": { en: "Formal", tr: "Resmi" },
  "results.casual": { en: "Casual", tr: "Samimi" },
  "results.targetAudience": { en: "Target Audience", tr: "Hedef Kitle" },
  "results.usp": { en: "Unique Selling Points", tr: "Farklılaştıran Özellikler" },
  "results.confidence": { en: "Confidence", tr: "Güven" },
  "results.activeAds": { en: "active ads", tr: "aktif reklam" },
  "results.avg": { en: "Avg.", tr: "Ort." },
  "results.diffOpps": { en: "Differentiation Opportunities", tr: "Fark Yaratma Fırsatları" },
  "results.trend": { en: "Trend", tr: "Trend" },
  "results.frequency": { en: "Frequency", tr: "Sıklık" },
  "results.impact": { en: "Impact", tr: "Etki" },
  "results.high": { en: "High", tr: "Yüksek" },
  "results.medium": { en: "Medium", tr: "Orta" },
  "results.low": { en: "Low", tr: "Düşük" },
  "results.recAngles": { en: "Recommended Angles", tr: "Önerilen Açılar" },
  // Trend names
  "results.trend.aiFirst": { en: "AI-first messaging", tr: "Yapay zekâ öncelikli mesajlaşma" },
  "results.trend.socialProof": { en: "Social proof emphasis", tr: "Sosyal kanıt vurgusu" },
  "results.trend.speedToValue": { en: "Speed-to-value framing", tr: "Hızlı değer sunumu" },
  "results.trend.competitorComparison": { en: "Competitor comparison ads", tr: "Rakip karşılaştırma reklamları" },
  "results.trend.educational": { en: "Educational content ads", tr: "Eğitim içerikli reklamlar" },
  // Recommended angles
  "results.angle.speed": { en: "Speed Angle", tr: "Hız Açısı" },
  "results.angle.speed.headline": { en: "Your marketing strategy in 5 minutes, not 5 weeks", tr: "Pazarlama stratejin 5 hafta değil, 5 dakikada hazır" },
  "results.angle.aiTeam": { en: "AI Team Angle", tr: "Yapay Zekâ Ekibi Açısı" },
  "results.angle.aiTeam.headline": { en: "6 AI agents working 24/7 on your marketing", tr: "Pazarlaman için 7/24 çalışan 6 yapay zekâ ajanı" },
  "results.angle.cost": { en: "Cost Angle", tr: "Maliyet Açısı" },
  "results.angle.cost.headline": { en: "The marketing team that costs less than one hire", tr: "Bir çalışandan daha uygun maliyetli pazarlama ekibi" },
  "results.angle.comparison": { en: "Comparison Angle", tr: "Karşılaştırma Açısı" },
  "results.angle.comparison.headline": { en: "Stop guessing. See what your competitors are doing right now", tr: "Tahmin etmeyi bırak. Rakiplerinin şu an ne yaptığını gör" },
  "results.allTemplates": { en: "All Templates", tr: "Tüm Şablonlar" },
  "results.socialMedia": { en: "Social Media", tr: "Sosyal Medya" },
  "results.display": { en: "Display", tr: "Görüntülü" },
  "results.search": { en: "Search", tr: "Arama" },
  "results.allSizes": { en: "All Sizes", tr: "Tüm Boyutlar" },
  "results.generateMore": { en: "Generate More", tr: "Daha Fazla Üret" },
  "results.download": { en: "Download", tr: "İndir" },
  "results.reportTitle": { en: "Marketing Strategy Report", tr: "Pazarlama Strateji Raporu" },
  "results.reportDesc": {
    en: "Complete analysis including brand audit, competitive landscape, trend insights, and recommended ad creatives.",
    tr: "Marka denetimi, rekabet ortamı, trend içgörüleri ve önerilen reklam görselleri dahil eksiksiz analiz."
  },
  "results.downloadPdf": { en: "Download PDF", tr: "PDF İndir" },
  "results.shareLink": { en: "Share Link", tr: "Link Paylaş" },
  "results.emailReport": { en: "Email Report", tr: "E-posta Gönder" },

  // Creatives Page
  "creatives.title": { en: "Ad Creatives", tr: "Reklam Görselleri" },
  "creatives.generateNew": { en: "Generate New", tr: "Yeni Üret" },
  "creatives.total": { en: "creatives total", tr: "görsel toplamda" },
  "creatives.empty": { en: "No creatives generated yet", tr: "Henüz görsel üretilmedi" },
  "creatives.emptyDesc": { en: "Run an analysis with image generation enabled to see creatives here.", tr: "Görsel üretimi açık bir analiz çalıştırarak burada görselleri görebilirsin." },

  // Reports Page
  "reports.title": { en: "Reports", tr: "Raporlar" },
  "reports.share": { en: "Share", tr: "Paylaş" },
  "reports.pages": { en: "pages", tr: "sayfa" },
  "reports.total": { en: "reports total", tr: "rapor toplamda" },
  "reports.fullReport": { en: "Full Report", tr: "Tam Rapor" },
  "reports.empty": { en: "No reports yet", tr: "Henüz rapor yok" },
  "reports.emptyDesc": { en: "Complete an analysis to generate your first report.", tr: "İlk raporunu oluşturmak için bir analiz tamamla." },

  // Settings Page
  "settings.title": { en: "Settings", tr: "Ayarlar" },
  "settings.desc": { en: "Manage your account and preferences", tr: "Hesabını ve tercihlerini yönet" },
  "settings.profile": { en: "Profile", tr: "Profil" },
  "settings.changeAvatar": { en: "Change Avatar", tr: "Avatarı Değiştir" },
  "settings.name": { en: "Name", tr: "İsim" },
  "settings.email": { en: "Email", tr: "E-posta" },
  "settings.save": { en: "Save Changes", tr: "Değişiklikleri Kaydet" },
  "settings.connected": { en: "Connected Accounts", tr: "Bağlı Hesaplar" },
  "settings.connect": { en: "Connect", tr: "Bağla" },
  "settings.billing": { en: "Billing", tr: "Faturalandırma" },
  "settings.proPlan": { en: "Pro Plan", tr: "Pro Plan" },
  "settings.manage": { en: "Manage", tr: "Yönet" },
  "settings.creativesUsed": { en: "ad creatives used this month", tr: "reklam görseli bu ay kullanıldı" },
  "settings.notifications": { en: "Notifications", tr: "Bildirimler" },
  "settings.notifComplete": { en: "Analysis complete", tr: "Analiz tamamlandı" },
  "settings.notifWeekly": { en: "Weekly report summary", tr: "Haftalık rapor özeti" },
  "settings.notifCompetitor": { en: "New competitor detected", tr: "Yeni rakip tespit edildi" },

  // 404
  "notFound.title": { en: "Oops! Page not found", tr: "Sayfa bulunamadı" },
  "notFound.back": { en: "Return to Home", tr: "Ana Sayfaya Dön" },

  // ==================== AUTH ====================
  "auth.invalidCredentials": { en: "Invalid email or password", tr: "Geçersiz e-posta veya şifre" },
  "auth.emailExists": { en: "Email already registered", tr: "Bu e-posta zaten kayıtlı" },
  "auth.passwordMin": { en: "Password must be at least 6 characters", tr: "Şifre en az 6 karakter olmalı" },
  "auth.logout": { en: "Log Out", tr: "Çıkış Yap" },

  // ==================== DASHBOARD EXTRAS ====================
  "dash.noAnalyses": { en: "No analyses yet. Enter a URL above to start.", tr: "Henüz analiz yok. Başlamak için yukarıya bir URL gir." },
  "dash.noData": { en: "No data available", tr: "Veri bulunamadı" },
  "dash.failed": { en: "Failed", tr: "Başarısız" },
  "dash.analysisFailed": { en: "Analysis failed", tr: "Analiz başarısız oldu" },
  "dash.analysisComplete": { en: "Analysis complete", tr: "Analiz tamamlandı" },
  "dash.pipelineFailed": { en: "Pipeline failed", tr: "Pipeline başarısız oldu" },
  "dash.unknownError": { en: "An unknown error occurred.", tr: "Bilinmeyen bir hata oluştu." },
  "dash.retry": { en: "Retry", tr: "Tekrar Dene" },
  "dash.newAnalysis": { en: "New Analysis", tr: "Yeni Analiz" },
  "dash.retrying": { en: "retrying", tr: "tekrar deneniyor" },
  "dash.retries": { en: "retries", tr: "deneme" },
  "dash.stepsSkipped": { en: "Some steps were skipped", tr: "Bazı adımlar atlandı" },
  "settings.saved": { en: "Profile saved", tr: "Profil kaydedildi" },

  // ==================== CHARTS ====================
  "chart.adCount": { en: "Ad Count by Competitor", tr: "Rakip Bazında Reklam Sayısı" },
  "chart.trendImpact": { en: "Trend Impact Scores", tr: "Trend Etki Puanları" },
  "chart.topPerformers": { en: "Top Performers", tr: "Yüksek Performanslı" },
  "chart.lowPerformers": { en: "Low Performers", tr: "Düşük Performanslı" },
  "chart.average": { en: "Average", tr: "Ortalama" },
  "chart.performance": { en: "Ad Performance Distribution", tr: "Reklam Performans Dağılımı" },
  "chart.total": { en: "Total", tr: "Toplam" },

  // ==================== AI INSIGHTS ====================
  "dash.insights": { en: "AI Insights", tr: "AI İçgörüler" },
  "insights.title": { en: "AI Insights", tr: "AI İçgörüler" },
  "insights.desc": { en: "Aggregated intelligence from all your analyses", tr: "Tüm analizlerinden toplanan yapay zekâ içgörüleri" },
  "insights.totalAnalyzed": { en: "Total Analyzed", tr: "Toplam Analiz" },
  "insights.totalDesc": { en: "Completed analyses across all brands", tr: "Tüm markalar genelinde tamamlanan analizler" },
  "insights.topSector": { en: "Top Sector", tr: "En Çok Analiz Edilen Sektör" },
  "insights.analyses": { en: "analyses", tr: "analiz" },
  "insights.noData": { en: "No data yet", tr: "Henüz veri yok" },
  "insights.avgTime": { en: "Avg. Time", tr: "Ort. Süre" },
  "insights.avgTimeDesc": { en: "Average analysis completion time", tr: "Ortalama analiz tamamlama süresi" },
  "insights.sectorDist": { en: "Sector Distribution", tr: "Sektör Dağılımı" },
  "insights.aiTips": { en: "AI Recommendations", tr: "AI Öneriler" },
  "insights.tip1Title": { en: "Diversify Sectors", tr: "Sektörleri Çeşitlendir" },
  "insights.tip1Desc": { en: "Analyzing multiple sectors reveals cross-industry patterns that improve ad performance.", tr: "Birden fazla sektörü analiz etmek, reklam performansını artıran sektörler arası kalıpları ortaya çıkarır." },
  "insights.tip2Title": { en: "Monitor Competitors Weekly", tr: "Rakipleri Haftalık İzle" },
  "insights.tip2Desc": { en: "Regular competitor analysis catches market shifts early and keeps your strategy fresh.", tr: "Düzenli rakip analizi, pazar değişikliklerini erken yakalar ve stratejini güncel tutar." },
  "insights.tip3Title": { en: "Refresh Creatives Monthly", tr: "Görselleri Aylık Yenile" },
  "insights.tip3Desc": { en: "Ad fatigue sets in after 4-6 weeks. Generate new creatives regularly for best results.", tr: "Reklam yorgunluğu 4-6 hafta sonra başlar. En iyi sonuçlar için düzenli yeni görseller üret." },
  "insights.tip4Title": { en: "Use Trend Data", tr: "Trend Verilerini Kullan" },
  "insights.tip4Desc": { en: "Align your messaging with current market trends for higher engagement rates.", tr: "Daha yüksek etkileşim oranları için mesajlarını güncel pazar trendleriyle uyumla." },
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("adonai-lang");
    return (saved === "tr" || saved === "en") ? saved : "en";
  });

  useEffect(() => {
    localStorage.setItem("adonai-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKey): string => {
    const entry = translations[key];
    return entry ? entry[lang] : key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

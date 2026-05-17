export const translations = {
  en: {
    // Splash & Welcome
    welcome: "Welcome",
    orchestrating: "Orchestrating Your World...",
    welcome_title: "Welcome to KaamKonnect",
    welcome_subtitle: "The first AI-powered service orchestrator that automates everything from intent to booking.",
    create_account: "Create Account",
    already_account: "Already have an account? Login",
    agentic_automation: "Agentic Automation for services",
    location_matching: "Real-time location matching",
    secure_execution: "Secure and traceable execution",
    
    // Auth
    login_title: "Welcome Back",
    login_subtitle: "Log in to continue orchestrating",
    email_placeholder: "Email Address",
    password_placeholder: "Password",
    login_btn: "Login",
    forgot_password: "Forgot Password?",
    signup_title: "Join KaamKonnect",
    signup_subtitle: "Start your journey with AI Agents",
    full_name: "Full Name",
    phone_number: "Phone Number",
    address: "Home Address",
    pick_location: "Pick Location",
    fetching_location: "Fetching address...",
    signup_btn: "Create Account",
    creating_account: "Account Creation in Progress...",
    verifying_user: "User Verification in Progress...",
    
    // Tabs
    home_tab: "Home",
    bookings_tab: "Bookings",
    activity_tab: "Activity",
    profile_tab: "Profile",

    // Hamburger/Brain
    system_control: "SYSTEM CONTROL",
    ai_auto_mode: "AI Automation Mode",
    auto_booking: "ON - Auto Booking",
    manual_mode: "OFF - Manual Mode",
    speed: "Orchestration Speed",
    balanced: "Balanced (Recommended)",
    fast: "Turbo Mode (Fast)",
    slow: "Deep Reasoning (Slow)",
    agent_visibility: "AGENT VISIBILITY (LIVE)",
    live_monitor: "Live Agent Monitor",
    agent_traces: "Agent Traces (Logs)",
    ai_reasoning: "AI Reasoning View",
    user_settings: "USER SETTINGS",
    language: "Language",
    theme: "App Theme",
    dark_mode: "Dark Mode",
    account: "Account Settings",
    active: "Active",
    demo_mode: "DEMO MODE ACTIVE",
    run_scenario: "Run Scenario",
    
    // Home
    salam: "Salam",
    how_help: "How can your AI Agent help you today?",
    quick_orchestrations: "QUICK ORCHESTRATIONS",
    online_ready: "AI Orchestrator Online & Ready",
    type_request: "Type your request (English/Urdu)...",
    initializing: "Initializing Agents..."
  },
  ur: {
    // Splash & Welcome
    welcome: "Khush Amdeed",
    orchestrating: "Aapki Duniya ko Tartib de raha hai...",
    welcome_title: "KaamKonnect میں خوش آمدید",
    welcome_subtitle: "پہلا AI سے چلنے والا سروس آرکیسٹریٹر جو ارادے سے لے کر بکنگ تک سب کچھ خودکار کرتا ہے۔",
    create_account: "اکاؤنٹ بنائیں",
    already_account: "پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں",
    agentic_automation: "خدمات کے لیے ایجنٹک آٹومیشن",
    location_matching: "ریئل ٹائم لوکیشن میچنگ",
    secure_execution: "محفوظ اور ٹریس ایبل عملدرآمد",

    // Auth
    login_title: "خوش آمدید",
    login_subtitle: "آرکیسٹریٹنگ جاری رکھنے کے لیے لاگ ان کریں",
    email_placeholder: "ای میل ایڈریس",
    password_placeholder: "پاس ورڈ",
    login_btn: "لاگ ان کریں",
    forgot_password: "پاس ورڈ بھول گئے؟",
    signup_title: "KaamKonnect میں شامل ہوں",
    signup_subtitle: "AI ایجنٹس کے ساتھ اپنا سفر شروع کریں",
    full_name: "پورا نام",
    phone_number: "فون نمبر",
    address: "گھر کا پتہ",
    pick_location: "لوکیشن منتخب کریں",
    fetching_location: "پتہ تلاش کر رہے ہیں...",
    signup_btn: "اکاؤنٹ بنائیں",
    creating_account: "اکاؤنٹ بنانے کا عمل جاری ہے...",
    verifying_user: "صارف کی تصدیق کا عمل جاری ہے...",

    // Tabs
    home_tab: "ہوم",
    bookings_tab: "بکنگ",
    activity_tab: "سرگرمی",
    profile_tab: "پروفائل",

    // Hamburger/Brain
    system_control: "سسٹم کنٹرول",
    ai_auto_mode: "AI خودکار موڈ",
    auto_booking: "آن - خودکار بکنگ",
    manual_mode: "آف - مینوئل موڈ",
    speed: "رفتار کا کنٹرول",
    balanced: "متوازن (تجویز کردہ)",
    fast: "ٹربو موڈ (تیز)",
    slow: "گہری سوچ (آہستہ)",
    agent_visibility: "ایجنٹ کی کارکردگی (لائیو)",
    live_monitor: "لائیو ایجنٹ مانیٹر",
    agent_traces: "ایجنٹ لاگز",
    ai_reasoning: "AI کی وجہ تلاش کریں",
    user_settings: "صارف کی سیٹنگز",
    language: "زبان (اردو)",
    theme: "ایپ تھیم",
    dark_mode: "ڈارک موڈ",
    account: "اکاؤنٹ سیٹنگز",
    active: "فعال",
    demo_mode: "ڈیمو موڈ فعال ہے",
    run_scenario: "سنیریو چلائیں",
    
    // Home
    salam: "سلام",
    how_help: "آج آپ کا AI ایجنٹ آپ کی کیسے مدد کر سکتا ہے؟",
    quick_orchestrations: "فوری خدمات",
    online_ready: "AI آرکیسٹریٹر آن لائن اور تیار ہے",
    type_request: "اپنی درخواست لکھیں (انگریزی/اردو)...",
    initializing: "ایجنٹس شروع ہو رہے ہیں..."
  }
};

export const t = (key, lang = 'en') => {
  if (!translations[lang]) return key;
  return translations[lang][key] || key;
};

/* ============================================================
   THE PUBLIC LEDGER — language support (বাংলা / English)
   Must load AFTER db.js and BEFORE common.js on every public page.

   How it works
   - The chosen language lives in localStorage ("tpl_lang"), and can be
     forced with ?lang=en / ?lang=bn in the URL (handy for sharing).
   - Bangla is the source language. Static HTML stays in Bangla; when
     English is selected, every Bangla string found in the DOM is
     swapped for its English entry in the dictionary below.
   - JS-rendered content uses the helpers (t, title, excerpt, body,
     catName, catDesc, num, fmtDate) so it follows the language too.
   - Article/category data can carry optional English fields:
       articles:   title_en, excerpt_en, body_en (array of paragraphs)
       categories: name_en, desc_en
     If an English field is empty, the Bangla text is shown instead.
   To translate a new static string, add "বাংলা": "English" below.
   ============================================================ */
(function (global) {
  'use strict';

  const STORE_KEY = 'tpl_lang';
  const LANGS = ['bn', 'en'];

  function readStored() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function writeStored(v) {
    try { localStorage.setItem(STORE_KEY, v); return localStorage.getItem(STORE_KEY) === v; }
    catch (e) { return false; }
  }

  function detect() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (LANGS.indexOf(fromUrl) > -1) { writeStored(fromUrl); return fromUrl; }
    const stored = readStored();
    return LANGS.indexOf(stored) > -1 ? stored : 'bn';
  }

  const lang = detect();
  const isEn = lang === 'en';

  function norm(s) { return String(s).normalize('NFC').replace(/\s+/g, ' ').trim(); }

  /* ---------------- dictionary (Bangla → English) ---------------- */
  const RAW = {
    // ---- shared chrome ----
    'প্রচ্ছদ': 'Home',
    'আমাদের সম্পর্কে': 'About Us',
    'যোগাযোগ': 'Contact',
    'ঢাকা সংস্করণ': 'Dhaka Edition',
    'দ্য পাবলিক লেজার': 'The Public Ledger',
    'দ্য পাবলিক লেজার লোগো': 'The Public Ledger logo',
    'মেনু': 'Menu',
    'মেনু খুলুন': 'Open menu',
    'মেনু বন্ধ করুন': 'Close menu',
    'মেনু ও বিভাগ': 'Menu & Sections',
    'প্রতিষ্ঠিত ২০২৬ · খণ্ড ১, সংখ্যা ১': 'Est. 2026 · Vol. 1, No. 1',
    'খবর খুঁজুন…': 'Search news…',
    'খবর খুঁজুন': 'Search news',
    'খুঁজুন': 'Search',
    'যোগাযোগ করুন': 'Contact us',
    'জরুরি খবর': 'Breaking',
    'সর্বশেষ': 'Latest',
    'নির্ভরযোগ্য প্রতিবেদন, স্পষ্ট বিশ্লেষণ। প্রতিটি খবর যাচাই করে, নিরপেক্ষভাবে তুলে ধরাই আমাদের অঙ্গীকার।': 'Reliable reporting, clear analysis. Our pledge is to verify every story and present it impartially.',
    'বিভাগ': 'Sections',
    'প্রতিষ্ঠান': 'Company',
    'ক্যারিয়ার': 'Careers',
    'বিজ্ঞাপন দিন': 'Advertise',
    'সহায়তা': 'Support',
    'গোপনীয়তা নীতি': 'Privacy Policy',
    'ব্যবহারের শর্তাবলি': 'Terms of Use',
    'আর্কাইভ': 'Archive',
    'সাইটম্যাপ': 'Sitemap',
    '© ২০২৬ দ্য পাবলিক লেজার। সর্বস্বত্ব সংরক্ষিত।': '© 2026 The Public Ledger. All rights reserved.',
    'উপরে যান': 'Back to top',
    'মূল কনটেন্টে যান': 'Skip to main content',

    // ---- page titles / meta ----
    'দ্য পাবলিক লেজার — নির্ভরযোগ্য সংবাদ, স্পষ্ট বিশ্লেষণ': 'The Public Ledger — Reliable news, clear analysis',
    'দ্য পাবলিক লেজার — রাজনীতি, অর্থনীতি, খেলাধুলা, বিনোদন ও প্রযুক্তির সর্বশেষ সংবাদ।': 'The Public Ledger — the latest news on politics, business, sports, entertainment and technology.',
    'আমাদের সম্পর্কে — দ্য পাবলিক লেজার': 'About Us — The Public Ledger',
    'বিজ্ঞাপন দিন — দ্য পাবলিক লেজার': 'Advertise — The Public Ledger',
    'আর্কাইভ — দ্য পাবলিক লেজার': 'Archive — The Public Ledger',
    'প্রতিবেদন — দ্য পাবলিক লেজার': 'Report — The Public Ledger',
    'ক্যারিয়ার — দ্য পাবলিক লেজার': 'Careers — The Public Ledger',
    'বিভাগ — দ্য পাবলিক লেজার': 'Section — The Public Ledger',
    'যোগাযোগ — দ্য পাবলিক লেজার': 'Contact — The Public Ledger',
    'গোপনীয়তা নীতি — দ্য পাবলিক লেজার': 'Privacy Policy — The Public Ledger',
    'সাইটম্যাপ — দ্য পাবলিক লেজার': 'Sitemap — The Public Ledger',
    'ব্যবহারের শর্তাবলি — দ্য পাবলিক লেজার': 'Terms of Use — The Public Ledger',
    'প্রতিবেদন পাওয়া যায়নি — দ্য পাবলিক লেজার': 'Report not found — The Public Ledger',

    // ---- home ----
    'সর্বাধিক পঠিত': 'Most Read',
    'বাজার সূচক': 'Market Indicators',
    'স্বর্ণ (ভরি)': 'Gold (per bhori)',
    '▲ ৫,৪৩২.১০ (+০.৮৪%)': '▲ 5,432.10 (+0.84%)',
    '▼ ১১৯.৪০ (−০.১২%)': '▼ 119.40 (−0.12%)',
    '▲ ১,৪২,৩৫০৳ (+০.৩৫%)': '▲ ৳142,350 (+0.35%)',
    'প্রতিদিনের নিউজলেটার': 'Daily Newsletter',
    'সকালে আপনার ইনবক্সে দিনের গুরুত্বপূর্ণ খবরের সারসংক্ষেপ পেতে সাবস্ক্রাইব করুন।': "Subscribe to get a summary of the day's key stories in your inbox each morning.",
    'আপনার ইমেইল': 'Your email',
    'ইমেইল': 'Email',
    'সাবস্ক্রাইব': 'Subscribe',
    'যেকোনো সময় আনসাবস্ক্রাইব করতে পারবেন।': 'You can unsubscribe at any time.',
    'ধন্যবাদ, আপনি তালিকাভুক্ত হয়েছেন ✓': "Thank you, you're subscribed ✓",
    'সব দেখুন →': 'See all →',
    'বার পঠিত': 'views',

    // ---- article ----
    'প্রতিবেদনটি খুঁজে পাওয়া যায়নি': 'Report not found',
    'লিংকটি ভুল হতে পারে অথবা প্রতিবেদনটি সরিয়ে নেওয়া হয়েছে।': 'The link may be incorrect, or the report has been removed.',
    'প্রচ্ছদে ফিরে যান': 'Back to the home page',
    'লিখেছেন': 'By',
    'শেয়ার': 'Share',
    'লিংক কপি': 'Copy link',
    'কপি হয়েছে ✓': 'Copied ✓',
    'প্রতীকী ছবি — দ্য পাবলিক লেজার': 'Representative image — The Public Ledger',
    'সম্পর্কিত প্রতিবেদন': 'Related Reports',

    // ---- category ----
    'কোনো প্রতিবেদন পাওয়া যায়নি': 'No reports found',
    'অন্য একটি বিভাগ বা ভিন্ন শব্দ দিয়ে খুঁজে দেখুন।': 'Try another section or different search terms.',
    'বিভাগ পাওয়া যায়নি': 'Section not found',
    'অনুসন্ধান ফলাফল': 'Search results',
    'সব প্রতিবেদন': 'All Reports',
    'সর্বশেষ সংবাদ': 'Latest News',
    'সংসদ, নীতিনির্ধারণ ও প্রশাসনের খবর': 'News from parliament, policymaking and administration',
    'মাঠের ভেতরে-বাইরের সবশেষ খবর': 'The latest from on and off the field',
    'চলচ্চিত্র, সংগীত ও সংস্কৃতির খবর': 'News on film, music and culture',
    'প্রযুক্তি ও উদ্ভাবনের হালচাল': 'The latest in technology and innovation',
    'বাজার, বাণিজ্য ও অর্থনীতির বিশ্লেষণ': 'Analysis of markets, trade and the economy',
    'সম্পাদকীয় ও কলাম': 'Editorials and columns',

    // ---- archive / sitemap ----
    'প্রকাশিত সব প্রতিবেদন': 'All Published Reports',
    'তারিখ অনুযায়ী সাজানো — নিচে ক্লিক করে যেকোনো পুরনো প্রতিবেদন পড়ুন।': 'Sorted by date — click below to read any past report.',
    'এখনো কোনো প্রতিবেদন প্রকাশিত হয়নি।': 'No reports have been published yet.',
    'দ্য পাবলিক লেজারের সব পাতার তালিকা।': 'A list of every page on The Public Ledger.',
    'প্রধান পাতা': 'Main pages',
    'নীতিমালা': 'Policies',

    // ---- about ----
    'প্রতিটি তথ্যের একটি হিসাব রাখি': 'We keep an account of every fact',
    'দ্য পাবলিক লেজার একটি স্বাধীন সংবাদমাধ্যম, যেখানে প্রতিটি প্রতিবেদন যাচাই করে প্রকাশ করা হয় — ঠিক যেভাবে একটি ভালো লেজারে প্রতিটি এন্ট্রি যাচাই হয়ে খতিয়ানে ওঠে।': 'The Public Ledger is an independent news outlet where every report is verified before publication — just as every entry in a good ledger is checked before it is booked.',
    '২০২৬ সালে যাত্রা শুরু করা দ্য পাবলিক লেজার রাজনীতি, অর্থনীতি, খেলাধুলা, বিনোদন, প্রযুক্তি ও মতামত — এই ছয়টি প্রধান বিভাগে সংবাদ পরিবেশন করে। আমাদের লক্ষ্য একটাই: পাঠকের কাছে সহজ, স্পষ্ট ও যাচাইকৃত তথ্য পৌঁছে দেওয়া।': 'Launched in 2026, The Public Ledger covers six main sections — politics, business, sports, entertainment, technology and opinion. Our goal is simple: to bring readers information that is easy to follow, clear and verified.',
    'নামটি ইচ্ছাকৃতভাবেই বেছে নেওয়া। একটি ভালো লেজারে কোনো এন্ট্রি বাদ পড়ে না, কোনো হিসাব লুকানো থাকে না। সাংবাদিকতাতেও আমরা একই নীতিতে বিশ্বাসী — স্বচ্ছতা ও জবাবদিহিতা।': 'The name was chosen deliberately. In a good ledger no entry is left out and no account is hidden. We believe in the same principles in journalism — transparency and accountability.',
    '৬': '6',
    '১৪+': '14+',
    '২০২৬': '2026',
    '৭': '7',
    'প্রধান বিভাগ': 'Main sections',
    'সাপ্তাহিক প্রতিবেদন': 'Weekly reports',
    'প্রতিষ্ঠাকাল': 'Founded',
    'নিয়মিত প্রতিবেদক': 'Regular reporters',
    'আমাদের নীতিমালা': 'Our Principles',
    'সত্যতা যাচাই': 'Fact-checking',
    'প্রকাশের আগে প্রতিটি তথ্য একাধিক সূত্র থেকে যাচাই করা হয়।': 'Every fact is verified against multiple sources before publication.',
    'নিরপেক্ষতা': 'Impartiality',
    'প্রতিবেদন ও মতামতকে সবসময় আলাদাভাবে চিহ্নিত করে উপস্থাপন করা হয়।': 'Reporting and opinion are always presented and labelled separately.',
    'সংশোধনের স্বচ্ছতা': 'Transparent corrections',
    'ভুল হলে তা স্পষ্টভাবে স্বীকার করে সংশোধিত তথ্য প্রকাশ করা হয়।': 'When we get something wrong, we acknowledge it clearly and publish the corrected information.',
    'সূত্রের সুরক্ষা': 'Protection of sources',
    'প্রয়োজনে সংবাদসূত্রের পরিচয় গোপন রাখার প্রতিশ্রুতি আমরা রক্ষা করি।': 'We keep our promise to protect the identity of sources when needed.',
    'সম্পাদকীয় দল': 'Editorial Team',
    'রা': 'RA', 'ফা': 'FH', 'তা': 'TH', 'ইম': 'IK',
    'রফিক আহমেদ': 'Rafiq Ahmed',
    'ফারহানা হক': 'Farhana Haque',
    'তানভীর হাসান': 'Tanvir Hasan',
    'ইমরান কবির': 'Imran Kabir',
    'রাজনীতি প্রতিবেদক': 'Politics Reporter',
    'অর্থনীতি প্রতিবেদক': 'Business Reporter',
    'ক্রীড়া প্রতিবেদক': 'Sports Reporter',
    'প্রযুক্তি প্রতিবেদক': 'Technology Reporter',

    // ---- contact ----
    'আমাদের সাথে যোগাযোগ করুন': 'Get in touch with us',
    'সংবাদ সূত্র, সংশোধনী অনুরোধ কিংবা সাধারণ জিজ্ঞাসা — যেকোনো বিষয়ে আমাদের জানান।': 'News tips, correction requests or general questions — let us know whatever it is.',
    '[সম্পাদকীয় ইমেইল এখানে বসবে]': '[Editorial email goes here]',
    'ফোন': 'Phone',
    '[যোগাযোগ নম্বর এখানে বসবে]': '[Contact number goes here]',
    'কার্যালয়': 'Office',
    '[কার্যালয়ের ঠিকানা এখানে বসবে]': '[Office address goes here]',
    'সাড়া দেওয়ার সময়': 'Response hours',
    'রবি–বৃহস্পতি, সকাল ১০টা – সন্ধ্যা ৬টা': 'Sunday–Thursday, 10 AM – 6 PM',
    'নাম': 'Name',
    'বিষয়': 'Subject',
    'বার্তা': 'Message',
    'বার্তা পাঠান': 'Send message',
    'অনুগ্রহ করে নাম, ইমেইল ও বার্তা পূরণ করুন।': 'Please fill in your name, email and message.',
    'ধন্যবাদ! আপনার বার্তা পাওয়া গেছে, দ্রুত সাড়া দেওয়া হবে।': "Thank you! We've received your message and will respond soon.",

    // ---- careers ----
    'আমাদের দলে যোগ দিন': 'Join our team',
    'সাংবাদিকতা, প্রযুক্তি ও ডিজাইন — বিভিন্ন বিভাগে আমরা নিয়মিত মেধাবী মানুষ খুঁজি।': 'Journalism, technology and design — we are always looking for talented people across our teams.',
    'স্টাফ রিপোর্টার': 'Staff Reporter',
    'রাজনীতি ও অর্থনীতি বিভাগের জন্য পূর্ণকালীন প্রতিবেদক প্রয়োজন। অভিজ্ঞতা: ২+ বছর।': 'We need a full-time reporter for the politics and business desks. Experience: 2+ years.',
    'সাব-এডিটর': 'Sub-editor',
    'কপি সম্পাদনা ও প্রকাশনার মান নিশ্চিত করার দায়িত্বে থাকবেন।': 'You will be responsible for copy editing and ensuring publishing quality.',
    'ফ্রন্ট-এন্ড ডেভেলপার': 'Front-end Developer',
    'নিউজ পোর্টালের প্রযুক্তি দলে যোগ দিয়ে পাঠক অভিজ্ঞতা উন্নত করার কাজে সহায়তা করবেন।': "You will join the news portal's tech team and help improve the reader experience.",
    'ফটোজার্নালিস্ট': 'Photojournalist',
    'মাঠপর্যায়ে ছবি ও ভিডিও সংগ্রহের দায়িত্ব পালন করবেন।': 'You will be responsible for gathering photos and video in the field.',
    'আগ্রহী প্রার্থীরা জীবনবৃত্তান্তসহ আবেদন পাঠাতে পারেন আমাদের <a href="contact.html">যোগাযোগ পাতার</a> মাধ্যমে।': 'Interested candidates can send an application with their CV through our <a href="contact.html">contact page</a>.',

    // ---- privacy ----
    'সর্বশেষ হালনাগাদ: ১৮ সেপ্টেম্বর, ২০২৬': 'Last updated: 18 September 2026',
    'দ্য পাবলিক লেজার পাঠকদের গোপনীয়তাকে গুরুত্ব দেয়। এই নীতিমালায় আমরা কী তথ্য সংগ্রহ করি এবং তা কীভাবে ব্যবহার করি তা ব্যাখ্যা করা হয়েছে।': "The Public Ledger takes readers' privacy seriously. This policy explains what information we collect and how we use it.",
    'আমরা যে তথ্য সংগ্রহ করি': 'Information we collect',
    'নিউজলেটার সাবস্ক্রিপশনের সময় প্রদত্ত ইমেইল ঠিকানা': 'Email addresses provided when subscribing to the newsletter',
    'যোগাযোগ ফর্মের মাধ্যমে পাঠানো নাম, ইমেইল ও বার্তা': 'Names, emails and messages sent through the contact form',
    'সাইট ব্যবহারের সাধারণ পরিসংখ্যান (পৃষ্ঠা ভিজিট, ব্রাউজার তথ্য)': 'General site usage statistics (page visits, browser information)',
    'তথ্যের ব্যবহার': 'How we use information',
    'সংগৃহীত তথ্য শুধুমাত্র সেবার মান উন্নয়ন, পাঠকের সাথে যোগাযোগ এবং নিউজলেটার পাঠানোর কাজে ব্যবহৃত হয়। কোনো তৃতীয় পক্ষের কাছে ব্যক্তিগত তথ্য বিক্রি করা হয় না।': 'Collected information is used only to improve our service, communicate with readers and send the newsletter. Personal information is never sold to any third party.',
    'কুকিজ': 'Cookies',
    'সাইটের কার্যকারিতা বজায় রাখতে সীমিত পরিসরে কুকিজ ব্যবহার করা হতে পারে। ব্রাউজার সেটিংস থেকে যেকোনো সময় কুকিজ নিষ্ক্রিয় করা যায়।': 'Cookies may be used in a limited way to keep the site working. You can disable cookies at any time in your browser settings.',
    'গোপনীয়তা সংক্রান্ত কোনো প্রশ্ন থাকলে আমাদের <a href="contact.html">যোগাযোগ পাতার</a> মাধ্যমে জানাতে পারেন।': 'If you have any privacy-related questions, let us know through our <a href="contact.html">contact page</a>.',

    // ---- terms ----
    'দ্য পাবলিক লেজার ব্যবহারের মাধ্যমে আপনি নিচের শর্তাবলিতে সম্মত হচ্ছেন বলে ধরে নেওয়া হয়।': 'By using The Public Ledger, you are deemed to agree to the terms below.',
    'কনটেন্টের ব্যবহার': 'Use of content',
    'এই সাইটের সব প্রতিবেদন, ছবি ও গ্রাফিক্স দ্য পাবলিক লেজারের সম্পত্তি। ব্যক্তিগত পাঠের জন্য কনটেন্ট ব্যবহার করা যাবে; পুনঃপ্রকাশ বা বাণিজ্যিক ব্যবহারের জন্য পূর্বানুমতি প্রয়োজন।': 'All reports, images and graphics on this site are the property of The Public Ledger. Content may be used for personal reading; prior permission is required for republication or commercial use.',
    'মন্তব্য নীতিমালা': 'Comment policy',
    'পাঠকের মন্তব্য সংযত ও প্রাসঙ্গিক হতে হবে। আপত্তিকর, বিদ্বেষমূলক বা মানহানিকর মন্তব্য সরিয়ে ফেলার অধিকার সম্পাদকীয় দল সংরক্ষণ করে।': 'Reader comments must be civil and relevant. The editorial team reserves the right to remove offensive, hateful or defamatory comments.',
    'দায়বদ্ধতার সীমা': 'Limitation of liability',
    'সর্বোচ্চ যত্নের সাথে তথ্য যাচাই করা হলেও, কোনো প্রতিবেদনে অনিচ্ছাকৃত ত্রুটি থাকতে পারে। ত্রুটি চিহ্নিত হলে তা যত দ্রুত সম্ভব সংশোধন করা হয়।': 'Although information is verified with the utmost care, a report may contain unintentional errors. When an error is identified, it is corrected as quickly as possible.',
    'শর্তাবলির পরিবর্তন': 'Changes to these terms',
    'প্রয়োজন অনুযায়ী এই শর্তাবলি হালনাগাদ করা হতে পারে। উল্লেখযোগ্য পরিবর্তন এই পাতায় জানিয়ে দেওয়া হবে।': 'These terms may be updated as needed. Significant changes will be announced on this page.',

    // ---- advertise ----
    'দ্য পাবলিক লেজারে বিজ্ঞাপন দিন': 'Advertise on The Public Ledger',
    'প্রতিদিন হাজারো পাঠকের কাছে আপনার ব্র্যান্ড পৌঁছে দিন — নির্ভরযোগ্য সংবাদের পাশে।': 'Put your brand in front of thousands of readers every day — alongside trusted news.',
    'বিভাগজুড়ে উপস্থিতি': 'Presence across sections',
    'প্রিমিয়াম ব্যানার স্লট': 'Premium banner slot',
    'সাইডবার': 'Sidebar',
    'প্রতি পাতায় দৃশ্যমান': 'Visible on every page',
    'নিউজলেটার': 'Newsletter',
    'স্পন্সরড এন্ট্রি': 'Sponsored entry',
    'হোমপেজ ব্যানার': 'Homepage banner',
    'প্রচ্ছদে সবচেয়ে বেশি দৃশ্যমান অবস্থানে আপনার বিজ্ঞাপন প্রদর্শিত হবে।': 'Your ad appears in the most visible position on the home page.',
    'বিভাগ স্পনসরশিপ': 'Section sponsorship',
    'নির্দিষ্ট একটি বিভাগ (যেমন প্রযুক্তি বা খেলাধুলা) স্পনসর করার সুযোগ।': 'The opportunity to sponsor a specific section (such as technology or sports).',
    'নেটিভ কনটেন্ট': 'Native content',
    'সম্পাদকীয় দলের সহায়তায় ব্র্যান্ডেড কনটেন্ট তৈরি ও প্রকাশ।': 'Branded content created and published with the help of our editorial team.',
    'বিজ্ঞাপন প্যাকেজ ও মূল্য তালিকা জানতে আমাদের বিজ্ঞাপন দলের সাথে <a href="contact.html">যোগাযোগ করুন</a>।': 'To learn about advertising packages and pricing, <a href="contact.html">contact</a> our advertising team.'
  };

  const DICT = new Map();
  Object.keys(RAW).forEach((k) => DICT.set(norm(k), RAW[k]));

  /* ---------------- translate helpers ---------------- */
  function t(bn) {
    if (!isEn || bn == null) return bn;
    const hit = DICT.get(norm(bn));
    return hit !== undefined ? hit : bn;
  }

  const has = (v) => typeof v === 'string' && v.trim() !== '';

  // Content fields: fall back to Bangla when no English was entered.
  function title(a) { return isEn && has(a.title_en) ? a.title_en : a.title_bn; }
  function excerpt(a) { return isEn && has(a.excerpt_en) ? a.excerpt_en : (a.excerpt_bn || ''); }
  function hasEnglishBody(a) { return Array.isArray(a.body_en) && a.body_en.some(has); }
  function body(a) { return (isEn && hasEnglishBody(a) ? a.body_en : a.body) || []; }
  function catName(c) { if (!c) return ''; return isEn && has(c.name_en) ? c.name_en : c.name_bn; }
  function catDesc(c) {
    if (!c) return '';
    if (!isEn) return c.desc_bn || '';
    return has(c.desc_en) ? c.desc_en : t(c.desc_bn || '');
  }

  function num(n) { return Number(n || 0).toLocaleString(isEn ? 'en-US' : 'bn-BD'); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  const DAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
  const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function fmtDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    if (isEn) return `${DAYS_EN[d.getDay()]}, ${d.getDate()} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`;
    return `${DAYS_BN[d.getDay()]}বার, ${d.getDate()} ${MONTHS_BN[d.getMonth()]} ${d.getFullYear()}`;
  }
  function monthYear(iso) {
    const d = new Date(iso + 'T00:00:00');
    return `${(isEn ? MONTHS_EN : MONTHS_BN)[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* ---------------- DOM translation (English only) ---------------- */
  const BN_RE = /[\u0980-\u09FF]/;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);
  const INLINE = new Set(['A', 'STRONG', 'EM', 'B', 'I', 'SPAN', 'SMALL', 'BR', 'MARK']);
  const ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];

  function translateAttrs(el) {
    ATTRS.forEach((name) => {
      const v = el.getAttribute(name);
      if (v && BN_RE.test(v)) {
        const hit = DICT.get(norm(v));
        if (hit !== undefined) el.setAttribute(name, hit);
      }
    });
  }

  function hasDirectBnText(el) {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && BN_RE.test(n.nodeValue)) return true;
    }
    return false;
  }

  function walk(el) {
    if (SKIP.has(el.tagName)) return;
    translateAttrs(el);

    // Paragraph with inline links etc. — match on its whole inner HTML.
    if (el.children.length && hasDirectBnText(el) && Array.prototype.every.call(el.children, (c) => INLINE.has(c.tagName))) {
      const hit = DICT.get(norm(el.innerHTML));
      if (hit !== undefined) { el.innerHTML = hit; return; }
    }

    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        if (!BN_RE.test(n.nodeValue)) continue;
        const hit = DICT.get(norm(n.nodeValue));
        if (hit !== undefined) {
          const m = n.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
          n.nodeValue = m[1] + hit + m[2];
        }
      } else if (n.nodeType === 1) {
        walk(n);
      }
    }
  }

  function apply(root) {
    if (!isEn) return;
    const r = root || document.body;
    if (r) walk(r);
  }

  function applyPage() {
    if (!isEn) return;
    document.documentElement.lang = 'en';
    const tt = DICT.get(norm(document.title));
    if (tt !== undefined) document.title = tt;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      const md = DICT.get(norm(meta.getAttribute('content') || ''));
      if (md !== undefined) meta.setAttribute('content', md);
    }
    apply(document.body);
  }

  /* ---------------- switching ---------------- */
  function setLang(next) {
    if (LANGS.indexOf(next) === -1 || next === lang) return;
    const u = new URL(location.href);
    u.searchParams.delete('lang');
    // If storage is blocked, carry the choice in the URL instead.
    if (!writeStored(next)) u.searchParams.set('lang', next);
    if (u.href === location.href) location.reload(); else location.replace(u.href);
  }

  global.TPL_I18N = {
    lang, isEn, t, apply, applyPage, setLang,
    title, excerpt, body, hasEnglishBody, catName, catDesc,
    num, esc, fmtDate, monthYear
  };

  // Static markup above this <script> is already parsed — translate it now.
  applyPage();
})(window);

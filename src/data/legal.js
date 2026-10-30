// The privacy policy and terms everyone agrees to. Change VERSION whenever the wording changes in a way
// people should agree to again; anyone who agreed to an older version is asked once more.
export const VERSION = '2026-10-24'
export const UPDATED = '24 October 2026'

// ✏️ Put the email address people should use for privacy questions and account help here
export const CONTACT_EMAIL = 'ADD-YOUR-EMAIL@example.com'

// Each section is a heading, then paragraphs; a paragraph given as a list shows as bullet points
export const PRIVACY = [
  {
    heading: 'Who we are',
    body: [
      `Reforge is an injury-aware training app run by James Meichtry in the United Kingdom. For anything about your data, email ${CONTACT_EMAIL}.`,
      'This policy explains what Reforge stores about you, why, who can see it and what you can do about it.',
    ],
  },
  {
    heading: 'What we store',
    body: [
      [
        'Your account: email address and password (the password is stored scrambled, so nobody can read it).',
        'Your profile: name, training style, experience, goals, bodyweight, best lifts and which body your map shows.',
        'Your training: programmes, the sets you log, live sessions and session reviews.',
        'Health information: your injuries, how they affect you, pain scores, check-ins, rehab plans and assessments.',
        'If you work with a physio, PT or coach: the notes, assessments, plans and targets they add for you, 1-1 sessions they book with you, session packages, and the messages you send each other.',
        'Friends and training together: who your friends are and the workouts you invite each other to.',
        'Notifications, if you turn them on: an address for your phone from Apple, Google or Mozilla, so notifications reach it. It is removed when you turn notifications off or sign out on that phone.',
      ],
    ],
  },
  {
    heading: 'Your health information',
    body: [
      'Injury and pain details are health information, which the law treats as extra sensitive. Reforge only uses them with your explicit consent, which you give when you agree to this policy.',
      'They are used for one thing: to shape your training and show how you are recovering. They are never sold, never used for advertising and never shared with anyone you have not connected with.',
      'Messages between you and your physio, PT or coach may include health information too. Only the two of you can read them.',
    ],
  },
  {
    heading: 'Why we use your information',
    body: [
      [
        'To run your account and the app (so we can provide the service you signed up for).',
        'To personalise training around your injuries and goals (with your consent).',
        'To let a professional you connect with see and manage your training, and to let you message each other (with your consent, given when you connect).',
        'To send notifications you have turned on, such as a new message, a workout invite or a booked 1-1.',
        'To keep Reforge secure and working, and to fix problems.',
      ],
    ],
  },
  {
    heading: 'Who can see it',
    body: [
      [
        'You.',
        'A physio, PT or coach, only after you connect with them using their code. You can disconnect at any time from your profile. When you do, they can no longer see your training or your messages; you keep your copy of the messages.',
        'Friends you add with a code. They see your training (sessions, sets, personal bests and the days you trained) and how strong each muscle is on your body map. They never see your injuries, pain, check-ins, notes or bodyweight. You can remove a friend at any time.',
        'The companies that host Reforge: Supabase (the database) and Vercel (the website). They store data for us under contract and cannot use it for anything else.',
        'Apple, Google or Mozilla, only to deliver notifications to your phone. Notifications say who something is from and what kind of thing it is (for example "New message from Sarah"). They never include what a message says or anything about your injuries, because they can appear on a locked screen.',
      ],
      'Some of these companies may handle data outside the UK. Where they do, they use the legal safeguards UK law requires.',
      'Nobody else, unless the law requires it.',
    ],
  },
  {
    heading: 'On your phone',
    body: [
      'Reforge keeps a copy of some data on your phone, such as your account, today’s workout and sets waiting to sync, so it opens fast and works without signal. Deleting your account clears it from the phone you delete it on.',
      'Workout cards (the pictures you can share after a session) are made on your phone. They only show your training, and they only go anywhere if you choose to share them.',
      'If you add a session to your calendar, it goes into your phone’s calendar or Google Calendar, and their own privacy terms apply to it from then on.',
      'Reforge does not use advertising or tracking cookies.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'For as long as you have an account. When you delete your account, everything is removed straight away, apart from copies in short-term backups, which are overwritten soon after.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      [
        'Download a copy of your data at any time: Profile, then Privacy and data.',
        'Correct anything that is wrong, in the app or by emailing us.',
        'Delete your account and everything in it: Profile, then Privacy and data.',
        'Withdraw consent for your health information at any time by deleting it or your account.',
        'Turn notifications off at any time: Profile, then Notifications.',
        'Complain to the Information Commissioner’s Office (ico.org.uk) if you are unhappy with how your data is handled.',
      ],
    ],
  },
  {
    heading: 'Age',
    body: ['Reforge is for people aged 16 and over.'],
  },
  {
    heading: 'Changes',
    body: ['If this policy changes in a way that matters, Reforge will ask you to agree again before you carry on.'],
  },
]

export const TERMS = [
  {
    heading: 'Using Reforge',
    body: [
      'By creating an account you agree to these terms and the privacy policy. Keep your password private; you are responsible for what happens on your account.',
    ],
  },
  {
    heading: 'Not medical advice',
    body: [
      'Reforge helps you organise training around injuries, but it is not a doctor or physiotherapist and does not diagnose or treat anything.',
      [
        'Get clearance from a qualified professional before training with an injury, after surgery, or if you have a health condition.',
        'Stop and get help if something hurts badly, swells, gives way, or you feel unwell.',
        'Messages are not for emergencies and may not be read straight away. If something is urgent, call 111, or 999 in an emergency.',
        'Training always carries some risk of injury. You train at your own risk.',
      ],
    ],
  },
  {
    heading: 'Professionals',
    body: [
      'Physios, PTs and coaches who use Reforge remain fully responsible for their own professional advice and for the care of their clients, and must follow the rules of their profession.',
      'Clients choose to connect with a professional and can disconnect at any time.',
      'Advice a professional gives in messages, targets or plans is their advice, not Reforge’s.',
    ],
  },
  {
    heading: 'Fair use',
    body: [
      'Don’t misuse Reforge: no trying to access other people’s data, no attacks on the service, and nothing illegal or abusive, including in messages. Accounts that do may be closed.',
    ],
  },
  {
    heading: 'The service',
    body: [
      'Reforge is still growing. Features may change, and while we work hard to keep it running and your data safe, we can’t promise it will always be available or free of mistakes.',
      'Nothing in these terms limits liability that the law does not allow to be limited, such as for death or personal injury caused by negligence. Otherwise, Reforge is not liable for indirect losses.',
    ],
  },
  {
    heading: 'Ending your account',
    body: ['You can delete your account at any time from your profile. Everything in it is removed.'],
  },
  {
    heading: 'The law',
    body: ['These terms are governed by the law of England and Wales.'],
  },
]

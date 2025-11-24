import React from 'react';
import './LandingPage.css';

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200">
      <div className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 justify-center px-4 sm:px-8 md:px-20 lg:px-40 py-5">
          <div className="layout-content-container flex w-full max-w-[960px] flex-1 flex-col">
            {/* TopNavBar */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-b-[#253446] px-2 md:px-10 py-3">
              <div className="flex items-center gap-4 text-gray-900 dark:text-white">
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z" fill="currentColor" />
                  </svg>
                </div>
                <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                  HireAI
                </h2>
              </div>
              <div className="hidden md:flex flex-1 justify-end gap-8">
                <div className="flex items-center gap-9">
                  <a className="text-gray-600 dark:text-white text-sm font-medium leading-normal" href="#">
                    Features
                  </a>
                  <a className="text-gray-600 dark:text-white text-sm font-medium leading-normal" href="#">
                    Pricing
                  </a>
                  <a className="text-gray-600 dark:text-white text-sm font-medium leading-normal" href="#">
                    About Us
                  </a>
                  <a className="text-gray-600 dark:text-white text-sm font-medium leading-normal" href="#">
                    Contact
                  </a>
                </div>
                <div className="flex gap-2">
                  <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]">
                    <span className="truncate">Schedule Demo</span>
                  </button>
                  <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-[#253446] text-gray-800 dark:text-white text-sm font-bold leading-normal tracking-[0.015em]">
                    <span className="truncate">Log In</span>
                  </button>
                </div>
              </div>
              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button className="text-gray-600 dark:text-white">
                  <span className="material-symbols-outlined">menu</span>
                </button>
              </div>
            </header>

            {/* HeroSection */}
            <main className="flex-col">
              <div className="@container py-16 sm:py-24">
                <div className="flex flex-col gap-10 px-4 py-10 @[480px]:gap-12 @[864px]:flex-row-reverse">
                  <div className="flex-1 flex items-center justify-center">
                    <div
                      className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-lg"
                      style={{
                        backgroundImage:
                          'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDRmqpSDL4EVFZKgyzclitfaNeBOrBlsaOXmcX90b102_07oYpjFodlYkBIHXr7uD1V1JgXUNxZweO-58AhXEpRPOlwZHNOK-jWjgjJxZ3wXBR56pDI2Vkv-lD3BV79rJSavKANahc4QmZAxYg4QWF4eonrdDRMwZ-EvTHtKxgf1tXptsLwv7hhZbSwtAfMTl19YX8dHb9sS41RYrVWqZuUjBvLRNoTr3keoseyDU5McslVl9sHiREGOq3-VM9bpLIy65xcuopYoSs9")',
                      }}
                      role="img"
                      aria-label="Abstract 3D shapes in soft blue and white tones, representing AI and technology."
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-6 @[480px]:gap-8 @[864px]:justify-center">
                    <div className="flex flex-col gap-4 text-left">
                      <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] @[480px]:text-5xl @[480px]:font-black @[480px]:leading-tight @[480px]:tracking-[-0.033em]">
                        Automated Professional Interviews — Powered by AI.
                      </h1>
                      <p className="text-gray-600 dark:text-gray-300 text-base font-normal leading-normal @[480px]:text-lg @[480px]:font-normal @[480px]:leading-normal">
                        Schedule, conduct and evaluate interviews with automated proctoring and real-time detection.
                      </p>
                    </div>
                    <div className="flex-wrap gap-3 flex">
                      <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 @[480px]:h-12 @[480px]:px-5 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] @[480px]:text-base @[480px]:font-bold @[480px]:leading-normal @[480px]:tracking-[0.015em]">
                        <span className="truncate">Get Started</span>
                      </button>
                      <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 @[480px]:h-12 @[480px]:px-5 bg-gray-200 dark:bg-[#253446] text-gray-800 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] @[480px]:text-base @[480px]:font-bold @[480px]:leading-normal @[480px]:tracking-[0.015em]">
                        <span className="truncate">Schedule Demo</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SectionHeader (Social Proof) */}
              <div className="py-10">
                <h4 className="text-gray-500 dark:text-[#95abc6] text-sm font-bold leading-normal tracking-[0.015em] px-4 py-2 text-center">
                  Powering hiring for leading companies
                </h4>
              </div>

              {/* ImageGrid (Logos) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 items-center p-4">
                <div className="flex justify-center">
                  <img
                    alt="Company A Logo"
                    className="h-8 filter grayscale hover:grayscale-0 transition-all duration-300 dark:invert dark:hover:invert-0"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCG7e8_R5Xqjufsx4Nx9NLKUV8sP4kCiI9g9uIxG0hH18vMfGiQ_YqIUG-Zn5Gvv9HoOrelTbXavK1KgvZKkdn52drDGNeUS34_72US5dL74IKzHgd2jDT_thi6P8NdSFtPOR05npFky5rQtzDhn2m0DsXRZ8xQYHsJYRQHQAS7jVAUMsoYfG-3M5OWWLIQp8gvh1l3SCfTDxM2wHq4x3iWHp0FyDEHLB8uzb9HZ8fpQVgQlbRRYHK98E2tl66fX5UzPdEFIPII1Pe4"
                  />
                </div>
                <div className="flex justify-center">
                  <img
                    alt="Company B Logo"
                    className="h-8 filter grayscale hover:grayscale-0 transition-all duration-300 dark:invert dark:hover:invert-0"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFDEplyOyPmzJxXjZwPkvSQO1u4vO-zRJbk0ch2cxhdJ8pKL3yJ1ceAoX5xF4PqDV8ViehyRgeGdUvjGCPXqAMuXoL94jrOWPVB6SwwmtEsvytLIVumo6K3RbdXXSLZb_ymS5QbAYKBeal18xmVqS7NjRQ66A658nrPY7jhHytMcg4EspjLH4V2_L9iGUc3WiPfZFeoiry1k2E5w4OL3P1qvJhmujcMbxBD94isWGvAbfIp602D2MS4wDmPETgwbiszI8Avo4Eu08E"
                  />
                </div>
                <div className="flex justify-center">
                  <img
                    alt="Company C Logo"
                    className="h-8 filter grayscale hover:grayscale-0 transition-all duration-300 dark:invert dark:hover:invert-0"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBn3WEBYL7fEBe_tMVnWgTkXog3a4gv5IK3HasJ9DqpyqtUUdmSQ_M2ysU0_NBT25QnoRUHbIvPvM8JMxNKBwi7ERNEMASlNxH82dP-JtVGu5biNOvlwrEbJRXY41fYiWplTUOLGT2fypUX8K-Sg7k_EFTD2d9DX_qsWkXfQCHbbxj-GhtuVzibq-z84dX2ttXusawEHvJGvYWu9uLkWjbEByEsZNuvoTrfxewb4Obp0vNa7eENemxDG1IYxu2-hgjfc_OMNd9Z1pXt"
                  />
                </div>
                <div className="flex justify-center">
                  <img
                    alt="Company D Logo"
                    className="h-8 filter grayscale hover:grayscale-0 transition-all duration-300 dark:invert dark:hover:invert-0"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_gImfEQjBMUi5CFRashH8nvqLtpMsz7xPSQp0EPYj-ag52lk_Sf52pbXvDTXky7S6ZnM8qqoPwhx-Hha3yrts0A-zrlLm93bHPJnVTkUrzTxkC6r7GTi3E3N6i9la8vNCSksqoIw33OJBduAT8M9CFLlQZ0HiSkOZ0MRv1eK7LLGjDz5PsD99g0CnsP3uTuYk5Ge33n4DhcEgTPTzTiQ4EIdKjjsJi7T7NKluWQjB7JcQsaIBy1Ydn9ZB9utje3ZbNA6pb_8ZUODf"
                  />
                </div>
                <div className="flex justify-center">
                  <img
                    alt="Company E Logo"
                    className="h-8 filter grayscale hover:grayscale-0 transition-all duration-300 dark:invert dark:hover:invert-0"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2XlBYkuymjBY_8KCpRHrp_xLti2bNaWjn6N6T_3P7zn8fTRuydoWQnFjc8bHC0DvVVdkit1VNd8WLpgH82CSXSs6zU0d0jLohifnsOY2Rej00NkMesFFNBX4PGg_0R2ukTQPjYHjWnpEpybTUtQzdIaBivmagndCRogD38r6mecq2tQUZj2RBoT_wA2O5Ai31AooNjDIcbb2QtAjyIGvThGzswE_CTk5ilfwH3kKDRk5vpMtxFX2LtXWuS1GFShPDyCeYmipaLfMf"
                  />
                </div>
              </div>

              {/* FeatureSection */}
              <div className="flex flex-col gap-10 px-4 py-24 @container">
                <div className="flex flex-col gap-4 text-center items-center">
                  <h2 className="text-gray-900 dark:text-white text-3xl font-bold leading-tight tracking-tight @[480px]:text-4xl @[480px]:font-black @[480px]:leading-tight @[480px]:tracking-[-0.033em] max-w-[720px]">
                    Intelligent Features for Modern Hiring
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-base font-normal leading-normal max-w-[720px]">
                    Explore the core features designed to streamline your hiring process, ensure integrity, and provide deep insights.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="flex flex-1 gap-4 rounded-xl border border-gray-200 dark:border-[#364a63] bg-white dark:bg-[#1b2532] p-6 flex-col text-left">
                    <div className="text-primary">
                      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                        security
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight">
                        Automated Proctoring
                      </h3>
                      <p className="text-gray-500 dark:text-[#95abc6] text-sm font-normal leading-normal">
                        Our AI monitors interviews to ensure integrity and prevent cheating with real-time alerts.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-1 gap-4 rounded-xl border border-gray-200 dark:border-[#364a63] bg-white dark:bg-[#1b2532] p-6 flex-col text-left">
                    <div className="text-primary">
                      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                        analytics
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight">
                        Real-time Analytics
                      </h3>
                      <p className="text-gray-500 dark:text-[#95abc6] text-sm font-normal leading-normal">
                        Gain actionable insights into candidate performance with comprehensive data analysis.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-1 gap-4 rounded-xl border border-gray-200 dark:border-[#364a63] bg-white dark:bg-[#1b2532] p-6 flex-col text-left">
                    <div className="text-primary">
                      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                        groups
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight">
                        Bias-Free Evaluation
                      </h3>
                      <p className="text-gray-500 dark:text-[#95abc6] text-sm font-normal leading-normal">
                        Reduce unconscious bias in your hiring process with objective, data-driven evaluations.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-1 gap-4 rounded-xl border border-gray-200 dark:border-[#364a63] bg-white dark:bg-[#1b2532] p-6 flex-col text-left">
                    <div className="text-primary">
                      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                        calendar_month
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight">
                        Seamless Scheduling
                      </h3>
                      <p className="text-gray-500 dark:text-[#95abc6] text-sm font-normal leading-normal">
                        Effortlessly schedule interviews across time zones with our integrated calendar system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How It Works Section */}
              <div className="flex flex-col items-center gap-10 px-4 py-16 text-center">
                <div className="flex flex-col gap-4">
                  <h2 className="text-gray-900 dark:text-white text-3xl font-bold leading-tight tracking-tight sm:text-4xl sm:font-black sm:tracking-[-0.033em]">
                    Simple Steps to Smarter Hiring
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-base max-w-2xl mx-auto">
                    Our intuitive platform makes it easy to get started. Just follow these three simple steps to revolutionize your hiring workflow.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center size-16 rounded-full bg-primary/20 text-primary font-bold text-2xl">
                      1
                    </div>
                    <h3 className="text-gray-900 dark:text-white text-xl font-bold">Schedule</h3>
                    <p className="text-gray-500 dark:text-[#95abc6] text-sm">
                      Create an interview, set the parameters, and invite candidates with a single link.
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center size-16 rounded-full bg-primary/20 text-primary font-bold text-2xl">
                      2
                    </div>
                    <h3 className="text-gray-900 dark:text-white text-xl font-bold">Conduct</h3>
                    <p className="text-gray-500 dark:text-[#95abc6] text-sm">
                      Candidates complete the AI-proctored interview on their own time, from anywhere.
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center size-16 rounded-full bg-primary/20 text-primary font-bold text-2xl">
                      3
                    </div>
                    <h3 className="text-gray-900 dark:text-white text-xl font-bold">Evaluate</h3>
                    <p className="text-gray-500 dark:text-[#95abc6] text-sm">
                      Review AI-generated reports, analytics, and interview recordings to make the best hire.
                    </p>
                  </div>
                </div>
              </div>

              {/* Final CTA Section */}
              <div className="px-4 py-24 text-center">
                <div className="flex flex-col items-center gap-6">
                  <h2 className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight sm:text-4xl sm:font-black sm:tracking-[-0.033em]">
                    Ready to revolutionize your hiring process?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 max-w-xl">
                    Join the growing list of companies that trust HireAI to find the best talent, faster and fairer.
                  </p>
                  <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em]">
                    <span className="truncate">Schedule a Demo</span>
                  </button>
                </div>
              </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 dark:border-[#253446] mt-10">
              <div className="w-full max-w-screen mx-auto p-4 md:py-8">
                <div className="sm:flex sm:items-center sm:justify-between">
                  <a className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse" href="#">
                    <div className="size-6 text-primary">
                      <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z" fill="currentColor" />
                      </svg>
                    </div>
                    <span className="self-center text-xl font-semibold whitespace-nowrap text-gray-900 dark:text-white">
                      HireAI
                    </span>
                  </a>
                  <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-500 sm:mb-0 dark:text-gray-400">
                    <li>
                      <a className="hover:underline me-4 md:me-6" href="#">
                        About
                      </a>
                    </li>
                    <li>
                      <a className="hover:underline me-4 md:me-6" href="#">
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a className="hover:underline me-4 md:me-6" href="#">
                        Licensing
                      </a>
                    </li>
                    <li>
                      <a className="hover:underline" href="#">
                        Contact
                      </a>
                    </li>
                  </ul>
                </div>
                <hr className="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8" />
                <span className="block text-sm text-gray-500 sm:text-center dark:text-gray-400">
                  © 2023{' '}
                  <a className="hover:underline" href="#">
                    HireAI™
                  </a>
                  . All Rights Reserved.
                </span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};


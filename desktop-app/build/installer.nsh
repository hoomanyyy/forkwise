; Extra pages for the Forkwise setup wizard (electron-builder assisted installer).
; The welcome page makes the wizard start like a standard Windows setup:
; Welcome, License, Install mode, Folder, Install, Finish.

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to the Forkwise Setup"
  !define MUI_WELCOMEPAGE_TEXT "This wizard installs Forkwise Desktop on your computer.$\r$\n$\r$\nForkwise Desktop lets your Forkwise agent work in the folders you choose and, when you allow it, use this computer for you.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend

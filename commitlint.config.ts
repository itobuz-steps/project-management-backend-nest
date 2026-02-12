const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
    'validate-commit-message': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'validate-commit-message': ({ subject }: { subject: string }) => {
          if (/^PM-\d+\s.*$/.test(subject)) {
            return [true];
          }

          return [
            false,
            `${BOLD}${RED}❌ Invalid commit message format${RESET}\n\n` +
              `${BOLD}${CYAN}Expected pattern:${RESET}\n` +
              `  '<type>: [PM-<ISSUE_ID>] <commit-message>'\n\n` +
              `${BOLD}${GREEN}Example:${RESET}\n` +
              `  ${GREEN}feat: [PM-1234] add new login endpoint${RESET}\n\n` +
              `${YELLOW}Need help? Run:${RESET} ${BOLD}\`npm run commit\`${RESET}`,
          ];
        },
      },
    },
  ],
};

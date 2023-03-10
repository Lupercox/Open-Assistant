import parser from "accept-language-parser";
import type { NextApiRequest } from "next";
import { i18n } from "src/../next-i18next.config";
import prisma from "src/lib/prismadb";
import type { BackendUserCore } from "src/types/Users";

const LOCALE_SET = new Set(i18n.locales);

/**
 * Returns the most appropriate user language using the following priority:
 *
 * 1. The `NEXT_LOCALE` cookie which is set by the client side and will be in
 *    the set of supported locales.
 * 2. The `accept-language` header if it contains a supported locale as set by
 *    the i18n module.
 * 3. "en" as a final fallback.
 */
const getUserLanguage = (req: NextApiRequest) => {
  const cookieLanguage = req.cookies["NEXT_LOCALE"];
  if (cookieLanguage) {
    return cookieLanguage;
  }
  const headerLanguages = parser.parse(req.headers["accept-language"]);
  if (headerLanguages.length > 0 && LOCALE_SET.has(headerLanguages[0].code)) {
    return headerLanguages[0].code;
  }
  return "en";
};

/**
 * Returns a `BackendUserCore` that can be used for interacting with the Backend service.
 *
 * @param {string} id The user's web auth id.
 *
 * @return {BackendUserCore} The most specific auth type and id for the user.
 */
const getBackendUserCore = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      accounts: true,
    },
  });

  // If there are no linked accounts, just use what we have locally.
  if (user.accounts.length === 0) {
    return {
      id: user.id,
      display_name: user.name,
      auth_method: "local",
    } as BackendUserCore;
  }

  // Otherwise, use the first linked account that the user created.
  return {
    id: user.accounts[0].providerAccountId,
    display_name: user.name,
    auth_method: user.accounts[0].provider,
  } as BackendUserCore;
};

export { getBackendUserCore, getUserLanguage };

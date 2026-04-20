import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";

export default getRequestConfig(async () => {
  const locale = "de";
  const messages = (await import(`./messages/${locale}.json`)).default as AbstractIntlMessages;
  return { locale, messages };
});

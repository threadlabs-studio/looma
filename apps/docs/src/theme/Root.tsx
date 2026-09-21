import React from "react";
import type { Props } from "@theme/Root";

import { FrameworkModeProvider } from "../components/FrameworkMode";

/** Supplies reader preferences without coupling them to an individual docs page. */
export default function Root({ children }: Props): JSX.Element {
  return <FrameworkModeProvider>{children}</FrameworkModeProvider>;
}

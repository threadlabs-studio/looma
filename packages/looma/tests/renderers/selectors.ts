/** Observe component roots through each renderer's public identity without changing their DOM. */
export const componentRoot = (tag: string): string => `:is([component~="${tag}"], [data-component~="${tag}"], .${tag}, [${tag}])`;

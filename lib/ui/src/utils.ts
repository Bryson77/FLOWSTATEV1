export type ClassValue = ClassValue[] | Record<string, boolean | number | string | null | undefined> | string | number | boolean | null | undefined;

function toVal(mix: ClassValue): string {
  let k;
  let y;
  let str = '';

  if (typeof mix === 'string' || typeof mix === 'number') {
    str += mix;
  } else if (typeof mix === 'object') {
    if (Array.isArray(mix)) {
      const len = mix.length;
      for (k = 0; k < len; k++) {
        if (mix[k]) {
          if ((y = toVal(mix[k]))) {
            if (str) str += ' ';
            str += y;
          }
        }
      }
    } else {
      for (y in mix) {
        if (mix && mix[y]) {
          if (str) str += ' ';
          str += y;
        }
      }
    }
  }

  return str;
}

export function clsx(...args: ClassValue[]): string {
  let i = 0;
  let tmp;
  let x;
  let str = '';
  const len = args.length;

  for (; i < len; i++) {
    if ((tmp = args[i])) {
      if ((x = toVal(tmp))) {
        if (str) str += ' ';
        str += x;
      }
    }
  }

  return str;
}

export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}

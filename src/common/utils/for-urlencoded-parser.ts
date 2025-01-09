import * as querystring from 'querystring';

type UrlEncodedData = { [key: string]: any };

function keysToString(keys: any[]) {
  if (keys.length == 1) return keys[0];

  return (
    keys[0] +
    keys
      .slice(1)
      .map((key) => '[' + key + ']')
      .join('')
  );
}

function extractObject(item: any, keys: any[]) {
  if (typeof item !== 'object') {
    const keyString = keysToString(keys);
    return { [keyString]: item };
  }

  let output = {};
  for (const key in item) {
    const keyString = keysToString([...keys, key]);

    const response = extractObject(item[key], [...keys, key]);
    output = { ...output, ...response };
  }
  return output;
}

export function stringify(data: UrlEncodedData) {
  const output = extractObject(data, []);

  return querystring.stringify(output);
}

export const urlParser = { stringify };

export default urlParser;

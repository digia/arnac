import {
  capitalize as Capitalize,
  invert as Invert,
} from 'lodash';
import Country from 'countryjs';
import { NotImplementedError, InputError } from '../foundation/errors';


// NOTE(digia): countryjs is suppose to be in the midst of adding these in.
// We'll just do this for now...
const usStates = {
  AL: 'Alabama',
  AK: 'Alaska',
  AS: 'American Samoa',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District Of Columbia',
  FM: 'Federated States Of Micronesia',
  FL: 'Florida',
  GA: 'Georgia',
  GU: 'Guam',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MH: 'Marshall Islands',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  MP: 'Northern Mariana Islands',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PW: 'Palau',
  PA: 'Pennsylvania',
  PR: 'Puerto Rico',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VI: 'Virgin Islands',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

export default function country(data = Country) {
  function info(iso2) {
    return data.info(iso2);
  }

  function name(iso, format = 'ISO2') {
    return data.name(iso, format);
  }

  function iso2To3(iso2) {
    return data.ISOcodes(iso2, 'ISO2')[3];
  }

  function iso3To2(iso3) {
    return data.ISOcodes(iso3, 'ISO3')[2];
  }

  function isoCode(countryName, isoVersion = 2) {
    const cntryName = Capitalize(countryName.toLowerCase());
    const codes = data.ISOcodes(cntryName, 'name');

    if (!codes) {
      throw new InputError(`Country [${cntryName}] does not exist.`);
    }

    return codes[isoVersion];
  }

  function states(iso2) {
    return data.states(iso2);
  }

  function stateName(countryIso2, stateIso2) {
    if (countryIso2 === 'US') {
      return usStates[stateIso2.toUpperCase()];
    }

    throw new NotImplementedError('stateName only supports US states at this time.');
  }

  function stateISO(countryISO2, countryStateName) {
    if (countryISO2 === 'US') {
      return Invert(usStates)[Capitalize(countryStateName.toLowerCase())];
    }

    throw new NotImplementedError('stateName only supports US states at this time.');
  }

  return { info, name, isoCode, iso2To3, iso3To2, states, stateName, stateISO };
}

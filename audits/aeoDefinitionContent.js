const AUDIT_NAME = '[AEO] Definition Content';

module.exports = function checkDefinitionContent($) {
  const dls = $('dl');
  let dtCount = 0;
  dls.each((_, el) => { dtCount += $(el).find('dt').length; });

  const dfnCount = $('dfn').length;

  if (dls.length === 0 && dfnCount === 0) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'No definition lists (<dl>) or inline definitions (<dfn>) found.',
      recommendation:
        'Definition-style content (term + explanation) is a strong featured snippet signal. ' +
        'If your page covers concepts, services, or terminology, consider adding a <dl> definition list ' +
        'or wrapping key terms in <dfn> elements. Google frequently extracts definition answers from <dl> lists.',
    };
  }

  if (dtCount >= 3) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `Definition list(s) found with ${dtCount} term(s) across ${dls.length} <dl> element(s).`,
      details: `<dl> elements: ${dls.length} | <dt> terms: ${dtCount}${dfnCount ? ` | <dfn> elements: ${dfnCount}` : ''}`,
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'warn',
    score: 70,
    message: `${dtCount > 0 ? `${dtCount} definition term(s) in <dl>` : ''}${dtCount > 0 && dfnCount > 0 ? ' and ' : ''}${dfnCount > 0 ? `${dfnCount} <dfn> element(s)` : ''} found.`,
    details: `<dl> elements: ${dls.length} | <dt> terms: ${dtCount} | <dfn> elements: ${dfnCount}`,
    recommendation:
      'Expand your definition content. A <dl> list with 3 or more term/definition pairs is a strong ' +
      'featured snippet signal. Each <dt> should be the term, each <dd> should be the plain-language definition.',
  };
};

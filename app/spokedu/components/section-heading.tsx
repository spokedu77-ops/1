import { marketingTypeEyebrow, marketingTypeSectionLead, marketingTypeSectionTitle } from '../lib/ui-classes';

type SpokeduSectionHeadingProps = {
  eyebrow?: string;
  title?: string;
  titleLines?: readonly string[];
  lead?: string;
  multilineTitle?: boolean;
};

/** Home·서브 랜딩 공통 섹션 제목 */
export function SpokeduSectionHeading({
  eyebrow,
  title,
  titleLines,
  lead,
  multilineTitle = false,
}: SpokeduSectionHeadingProps) {
  const heading =
    titleLines && titleLines.length > 0 ? (
      <h2 className={`${marketingTypeSectionTitle} ${eyebrow ? 'mt-2' : ''} w-full max-w-none`}>
        {titleLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h2>
    ) : title ? (
      <h2
        className={`${marketingTypeSectionTitle} ${eyebrow ? 'mt-2' : ''} ${multilineTitle ? 'whitespace-pre-line' : ''} w-full max-w-none`}
      >
        {title}
      </h2>
    ) : null;

  return (
    <div className="w-full text-left">
      {eyebrow ? <p className={marketingTypeEyebrow}>{eyebrow}</p> : null}
      {heading}
      {lead ? (
        <p className={`${marketingTypeSectionLead} mt-3 max-w-2xl`}>{lead}</p>
      ) : null}
    </div>
  );
}

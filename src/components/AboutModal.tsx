import { X, ExternalLink } from 'lucide-react';
import { WordPiggyLogo } from './WordPiggyLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <WordPiggyLogo size={24} />
            About Word Piggy
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              What is GDELT?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The GDELT Project monitors the world's broadcast, print, and web news from nearly
              every corner of every country in over 100 languages. It identifies people, locations,
              organizations, themes, sources, emotions, counts, quotes, images, and events driving
              our global society every second of every day.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              What do these counts represent?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              The counts shown in Word Piggy represent the <strong>volume of news articles</strong> containing
              your specified phrase(s) published during each time period. Each data point indicates how
              many articles from the selected sources mentioned the phrase.
            </p>
            <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Higher counts indicate more media coverage of a topic</li>
              <li>Counts are raw volumes, not normalized by total news output</li>
              <li>The same story syndicated across outlets may be counted multiple times</li>
              <li>Coverage varies by region and language of sources</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Region Filtering Modes
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Major Outlets:</strong> Searches only curated lists of major news publications
                for each region. This provides cleaner data from established sources but may miss
                coverage from smaller or regional outlets.
              </p>
              <p>
                <strong>Broad Region:</strong> Uses GDELT's source country classification to include
                all news sources from the selected countries. This provides more comprehensive coverage
                but includes less prominent sources.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Data Limitations
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>GDELT DOC API data before 2017 may be incomplete</li>
              <li>Not all web content is captured; coverage varies by source</li>
              <li>Phrase matching is exact (case-insensitive)</li>
              <li>Results are cached for 24 hours to improve performance</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Learn More
            </h3>
            <a
              href="https://www.gdeltproject.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 transition-colors"
            >
              Visit the GDELT Project
              <ExternalLink className="h-3 w-3" />
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

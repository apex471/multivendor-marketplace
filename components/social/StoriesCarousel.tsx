import Image from 'next/image';
import type { Story } from '../../types';

interface StoriesCarouselProps {
  stories: Story[];
  onStoryClick?: (story: Story) => void;
}

export default function StoriesCarousel({ stories, onStoryClick }: StoriesCarouselProps) {
  // Group stories by author
  const groupedStories = stories.reduce<Record<string, Story[]>>((acc, story) => {
    const authorId = story.authorId;
    if (!acc[authorId]) {
      acc[authorId] = [];
    }
    acc[authorId].push(story);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {Object.entries(groupedStories).map(([authorId, authorStories]) => {
          const story = authorStories[0];
          return (
            <button
              key={authorId}
              onClick={() => onStoryClick?.(story)}
              className="flex-shrink-0 text-center"
            >
              <div className="relative w-16 h-16 mb-1">
                {/* Story Ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                      {story.author.avatar ? (
                        <Image
                          src={story.author.avatar}
                          alt={story.author.username}
                          width={60}
                          height={60}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          👤
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-700 truncate w-16">
                {story.author.username}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

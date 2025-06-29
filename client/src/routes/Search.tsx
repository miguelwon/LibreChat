import React, { useState } from 'react';
import { Input } from '~/components/ui';
import { useLocalize } from '~/hooks';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const localize = useLocalize();

  const handleSearch = () => {
    // Handle search logic here
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="w-full max-w-lg">
        <h1 className="mb-4 text-center text-2xl font-bold">
          {localize('com_ui_classifical_search')}
        </h1>
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={localize('com_ui_search_placeholder')}
            className="flex-grow"
          />
          <button
            onClick={handleSearch}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            {localize('com_ui_search')}
          </button>
        </div>
      </div>
    </div>
  );
}

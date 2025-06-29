import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '~/components/ui';
import { useLocalize } from '~/hooks';
import { dataService } from 'librechat-data-provider';

interface SearchResult {
  mg_id: string;
  acordao_id: string;
  chunk: string;
  chunk_idx: number;
  n_chunks: number;
  tribunal: string;
  url: string;
  n_processo: string;
  data_acordao: string;
  relator: string[];
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const localize = useLocalize();

  const searchMutation = useMutation(
    (params: { query: string; page: number }) => dataService.classificalSearch(params),
    {
      onSuccess: (data) => {
        setResults(data.results);
      },
      onError: (error) => {
        console.error('Search failed:', error);
        setResults([]);
      },
    },
  );

  const handleSearch = (page = 1) => {
    if (!searchQuery.trim()) {
      return;
    }
    setCurrentPage(page);
    setSearchedQuery(searchQuery);
    searchMutation.mutate({ query: searchQuery, page });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) {
      return;
    }
    setCurrentPage(newPage);
    searchMutation.mutate({ query: searchedQuery, page: newPage });
    window.scrollTo(0, 0);
  };
  
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center ${
        results ? 'justify-start pt-10' : 'justify-center'
      }`}
    >
      <div className="w-full max-w-5xl px-4">
        <h1 className="mb-4 text-center text-2xl font-bold">
          {localize('com_ui_classifical_search')}
        </h1>
        <div className={`flex items-center space-x-2 ${results ? 'mb-8' : ''}`}>
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={localize('com_ui_search_placeholder')}
            className="flex-grow"
          />
          <button
            onClick={() => handleSearch()}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            disabled={searchMutation.isLoading}
          >
            {searchMutation.isLoading ? 'Searching...' : localize('com_ui_search')}
          </button>
        </div>

        {searchMutation.isLoading && <p className="text-center">Loading...</p>}
        {results && results.length > 0 && (
          <div className="flex flex-col">
            {results.map((result) => (
              <div key={result.mg_id} className="mb-6">
                <a
                  href={result.url.startsWith('http') ? result.url : `http://${result.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-bold text-blue-700 hover:underline"
                >
                  {result.n_processo}
                </a>
                <p className="text-sm text-gray-600 mt-1">{new Date(result.data_acordao).toLocaleDateString()}</p>
                <p className="mt-1 text-sm text-gray-800">{result.chunk}</p>
                <p className="mt-1 text-sm text-gray-600">
                  <strong>Relatores:</strong> {result.relator.join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
        {results && results.length === 0 && !searchMutation.isLoading && (
          <p className="text-center text-gray-500">No results found.</p>
        )}

        {results && results.length > 0 && (
          <div className="flex justify-center items-center mt-8 space-x-4 pb-12">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || searchMutation.isLoading}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
            >
              Anterior
            </button>
            <span className="font-semibold">{currentPage}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={results.length < 10 || searchMutation.isLoading}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

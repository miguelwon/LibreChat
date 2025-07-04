import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input, Button, Checkbox, Slider,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui';
import { useLocalize } from '~/hooks';
import { dataService } from 'librechat-data-provider';
import { Spinner } from '~/components/svg';
import Markdown from '~/components/Chat/Messages/Content/Markdown';
import { ArtifactProvider, CodeBlockProvider } from '~/Providers';

interface SumarioIA {
  sumario: string;
  referencias: string[];
  modelo: string;
  temperatura: number;
  full_response: string;
}

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
  sumario: string | null;
  sumario_ia: SumarioIA | null;
}

interface SummaryState {
  isLoading: boolean;
  data: SumarioIA | null;
  error: Error | null;
  isOpen: boolean;
}

const usePollForResult = (
  onSuccess: (data: { acordao_id: string; sumario_ia: SumarioIA | null }) => void,
) => {
  const poll = async (id: string) => {
    try {
      const data = await dataService.getSearchResult(id);
      if (data && data.sumario_ia) {
        onSuccess(data);
        return true; // Stop polling
      }
      return false; // Continue polling
    } catch (error) {
      console.error('Polling failed:', error);
      return true; // Stop polling on error
    }
  };

  const startPolling = (id: string) => {
    const intervalId = setInterval(async () => {
      const shouldStop = await poll(id);
      if (shouldStop) {
        clearInterval(intervalId);
      }
    }, 5000); // Poll every 5 seconds

    // Optional: Stop polling after a timeout
    setTimeout(() => {
      clearInterval(intervalId);
    }, 120000); // Stop after 2 minutes
  };

  return { startPolling };
};

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const localize = useLocalize();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTribunais, setSelectedTribunais] = useState<string[]>([]);
  const [relatorInput, setRelatorInput] = useState('');
  const [selectedRelatores, setSelectedRelatores] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState([2000, 2024]);
  const [allRelatores, setAllRelatores] = useState<string[]>([]);
  const [relatorSuggestions, setRelatorSuggestions] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [generatingSummaries, setGeneratingSummaries] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetch('/relatores.txt')
      .then((response) => response.text())
      .then((text) => {
        const relatoresList = text.split('\n').filter((r) => r.trim() !== '');
        setAllRelatores(relatoresList);
      });
  }, []);

  const TRIBUNAIS = ['JP', 'STA', 'STJ', 'TCAN', 'TCAS', 'TRC', 'TRE', 'TRG', 'TRL', 'TRP'];

  const searchMutation = useMutation(
    (params: {
      query: string;
      page: number;
      selectedTribunais: string[];
      selectedRelatores: string[];
      dateRange: number[];
    }) => dataService.classificalSearch(params),
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

  const { startPolling } = usePollForResult((data) => {
    setResults((prevResults) => {
      if (!prevResults) {
        return null;
      }
      return prevResults.map((result) => {
        if (result.acordao_id === data.acordao_id) {
          return { ...result, sumario_ia: data.sumario_ia };
        }
        return result;
      });
    });
    setGeneratingSummaries((prev) => prev.filter((id) => id !== data.acordao_id));
    queryClient.invalidateQueries(['search', searchedQuery]);
  });

  const summaryMutation = useMutation((id: string) => dataService.generateSummary(id), {
    onSuccess: (data, id) => {
      if (data.success) {
        startPolling(id);
      } else {
        console.error('Failed to initiate summary generation.');
        setGeneratingSummaries((prev) => prev.filter((genId) => genId !== id));
      }
    },
    onError: (error: Error, id) => {
      console.error('Summary generation failed:', error);
      setGeneratingSummaries((prev) => prev.filter((genId) => genId !== id));
    },
  });

  const handleGenerateSummary = (id: string) => {
    setGeneratingSummaries((prev) => [...prev, id]);
    summaryMutation.mutate(id);
  };

  const handleSearch = (page = 1) => {
    if (!searchQuery.trim()) {
      return;
    }
    setCurrentPage(page);
    setSearchedQuery(searchQuery);
    searchMutation.mutate({
      query: searchQuery,
      page,
      selectedTribunais,
      selectedRelatores,
      dateRange,
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) {
      return;
    }
    setCurrentPage(newPage);
    searchMutation.mutate({
      query: searchedQuery,
      page: newPage,
      selectedTribunais,
      selectedRelatores,
      dateRange,
    });
    window.scrollTo(0, 0);
  };
  
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleTribunal = (tribunal: string) => {
    setSelectedTribunais((prev) =>
      prev.includes(tribunal) ? prev.filter((t) => t !== tribunal) : [...prev, tribunal],
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setRelatorSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRelatorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRelatorInput(value);
    if (value.length > 1) {
      const suggestions = allRelatores.filter((r) =>
        r.toLowerCase().includes(value.toLowerCase()),
      );
      setRelatorSuggestions(suggestions);
    } else {
      setRelatorSuggestions([]);
    }
  };

  const addRelator = (relator?: string) => {
    const relatorToAdd = relator || relatorInput;
    if (relatorToAdd && !selectedRelatores.includes(relatorToAdd)) {
      setSelectedRelatores([...selectedRelatores, relatorToAdd]);
      setRelatorInput('');
      setRelatorSuggestions([]);
    }
  };

  const addSuggestedRelator = (suggestion: string) => {
    addRelator(suggestion);
  };

  const removeRelator = (relator: string) => {
    setSelectedRelatores(selectedRelatores.filter((r) => r !== relator));
  };

  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center justify-start transition-[padding-top] duration-300 ${
        !results && relatorSuggestions.length === 0 ? 'pt-48' : 'pt-10'
      }`}
    >
      <div className="w-full max-w-5xl px-4">
        <h1 className="mb-4 text-center text-2xl font-bold">
          {localize('com_ui_classifical_search')}
        </h1>
        <div className={`w-full ${results ? 'mb-8' : ''}`}>
          <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={localize('com_ui_search_placeholder')}
            className="flex-grow"
          />
            <Button
            onClick={() => handleSearch()}
              variant="submit"
            disabled={searchMutation.isLoading}
          >
            {searchMutation.isLoading ? 'Searching...' : localize('com_ui_search')}
            </Button>
          </div>

          <div className="mt-4 flex justify-start">
            <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
              Pesquisa Avançada
            </Button>
          </div>

          {showAdvanced && (
            <div className="mt-4 rounded-lg border p-4 dark:border-gray-600">
              <div className="mb-4">
                <label className="mb-2 block font-bold">Tribunal</label>
                <div className="flex flex-wrap gap-2">
                  {TRIBUNAIS.map((tribunal) => (
                    <Button
                      key={tribunal}
                      variant={selectedTribunais.includes(tribunal) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleTribunal(tribunal)}
                    >
                      {tribunal}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="relator-input" className="mb-2 block font-bold">
                  Relator
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="relator-input"
                    type="text"
                    value={relatorInput}
                    onChange={handleRelatorInputChange}
                    placeholder="Digite o nome do relator"
                    className="flex-grow"
                    autoComplete="off"
                  />
                  <Button onClick={() => addRelator()}>Adicionar</Button>
                </div>
                {relatorSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="mt-2 max-h-60 overflow-y-auto rounded-md border bg-background dark:border-gray-600"
                  >
                    {relatorSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => addSuggestedRelator(suggestion)}
                        className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRelatores.map((relator) => (
                    <div
                      key={relator}
                      className="flex items-center rounded-full bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
                    >
                      {relator}
                      <button
                        onClick={() => removeRelator(relator)}
                        className="ml-2 font-bold text-red-500"
                      >
                        x
          </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block font-bold">Data do Acórdão</label>
                <div className="flex items-center justify-between text-sm">
                  <span>{dateRange[0]}</span>
                  <span>{dateRange[1]}</span>
                </div>
                <Slider
                  value={dateRange}
                  onValueChange={setDateRange}
                  min={2000}
                  max={2024}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </div>

        {searchMutation.isLoading && <p className="text-center">Loading...</p>}
        {results && results.length > 0 && (
          <div className="flex flex-col">
            {results.map((result) => (
              <div
                key={result.mg_id}
                className="mb-6 rounded-lg border bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <h3 className="pr-4 text-xl font-semibold">
                    <a
                      href={result.url.startsWith('http') ? result.url : `http://${result.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline dark:text-blue-400"
                    >
                      Acórdão do {result.tribunal} de{' '}
                      {new Date(result.data_acordao).toLocaleDateString()}
                    </a>
                  </h3>
                  <div className="flex flex-shrink-0 space-x-2">
                    <Link to={`/acordao/${result.acordao_id}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        Ler Acórdão
                      </Button>
                    </Link>
                    {result.sumario && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Sumário
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Sumário</DialogTitle>
                          </DialogHeader>
                          <div className="border-t dark:border-gray-700">
                            <div className="max-h-[70vh] overflow-y-auto p-4 text-sm text-gray-800 dark:text-gray-300">
                              <p className="whitespace-pre-wrap leading-relaxed text-justify">
                                {result.sumario}
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {result.sumario_ia && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Sumário IA
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Sumário (Gerado por IA)</DialogTitle>
                          </DialogHeader>
                          <div className="border-t dark:border-gray-700">
                            <div className="markdown-container max-h-[70vh] overflow-y-auto p-4 text-sm text-gray-800 dark:text-gray-300">
                              <ArtifactProvider>
                                <CodeBlockProvider>
                                  <div className="prose dark:prose-invert max-w-none">
                                    <Markdown content={result.sumario_ia.sumario} />
                                  </div>
                                </CodeBlockProvider>
                              </ArtifactProvider>
                              {result.sumario_ia.referencias &&
                                result.sumario_ia.referencias.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="font-bold">Referências mais relevantes:</h4>
                                    <ul className="mt-2 list-disc pl-5">
                                      {result.sumario_ia.referencias.map((ref, index) => (
                                        <li key={index} className="mb-1">
                                          {ref}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {!result.sumario_ia && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateSummary(result.acordao_id)}
                        disabled={generatingSummaries.includes(result.acordao_id)}
                      >
                        {generatingSummaries.includes(result.acordao_id) ? (
                          <>
                            <Spinner className="mr-1" />
                            A Gerar...
                          </>
                        ) : (
                          'Gerar Sumário IA'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-800 dark:text-gray-300">
                  Processo: <span className="font-bold">{result.n_processo}</span> | Relator:{' '}
                  <span className="font-bold">{result.relator.join(', ')}</span>
                </p>
                <p className="mt-4 text-sm text-gray-800 dark:text-gray-300">{result.chunk}</p>
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

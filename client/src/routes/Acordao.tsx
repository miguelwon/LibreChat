import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dataService } from 'librechat-data-provider';
import Markdown from '~/components/Chat/Messages/Content/Markdown';
import { ArtifactProvider, CodeBlockProvider } from '~/Providers';

interface SumarioIA {
  sumario: string;
  topicos: string[];
}

interface AcordaoType {
  _id: string;
  tribunal: string;
  n_processo: string;
  data_acordao: string;
  relator: string[];
  descritores: string[];
  sumario?: string;
  sumario_ia?: SumarioIA;
  texto_decisao: string;
}

export default function Acordao() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'sumario' | 'sumario_ia'>('sumario');

  const {
    data: acordao,
    isLoading,
    error,
  } = useQuery<AcordaoType>(['acordao', id], () => dataService.getAcordao(id!), {
    enabled: !!id,
  });

  useEffect(() => {
    if (acordao) {
      if (acordao.sumario) {
        setActiveTab('sumario');
      } else if (acordao.sumario_ia) {
        setActiveTab('sumario_ia');
      }
    }
  }, [acordao]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center">Error fetching data</div>;
  }

  if (!acordao) {
    return <div className="flex h-screen items-center justify-center">Acordao not found</div>;
  }

  return (
    <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900">
      <div className="w-full overflow-y-auto bg-white p-6 dark:bg-gray-800 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Detalhes do Acórdão
          </h1>

          {/* Informações Gerais */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <h2 className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">
                Tribunal:
              </h2>
              <p className="text-gray-900 dark:text-gray-100">{acordao.tribunal}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <h2 className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">
                Processo:
              </h2>
              <p className="text-gray-900 dark:text-gray-100">{acordao.n_processo}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <h2 className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Data:</h2>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(acordao.data_acordao).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <h2 className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">
                Relator(es):
              </h2>
              <p className="text-gray-900 dark:text-gray-100">{acordao.relator.join(', ')}</p>
            </div>
          </div>

          {/* Descritores */}
          <div className="mb-8">
            <h2 className="mb-3 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Descritores:
            </h2>
            <div className="flex flex-wrap gap-2">
              {acordao.descritores.map((desc, index) => (
                <span
                  key={index}
                  className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                >
                  {desc}
                </span>
              ))}
            </div>
          </div>

          {/* Sumários */}
          {(acordao.sumario || acordao.sumario_ia) && (
            <div className="mb-8">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {acordao.sumario && (
                    <button
                      onClick={() => setActiveTab('sumario')}
                      className={`${
                        activeTab === 'sumario'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
                    >
                      Sumário
                    </button>
                  )}
                  {acordao.sumario_ia && (
                    <button
                      onClick={() => setActiveTab('sumario_ia')}
                      className={`${
                        activeTab === 'sumario_ia'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
                    >
                      Sumário IA
                    </button>
                  )}
                </nav>
              </div>
              <div className="mt-4">
                {activeTab === 'sumario' && acordao.sumario && (
                  <div className="w-full rounded-lg bg-gray-50 p-6 text-base leading-relaxed dark:bg-gray-900/50">
                    <p className="whitespace-pre-wrap text-justify">{acordao.sumario}</p>
                  </div>
                )}
                {activeTab === 'sumario_ia' && acordao.sumario_ia && (
                  <div className="w-full rounded-lg bg-gray-50 p-6 text-base leading-relaxed dark:bg-gray-900/50">
                    <ArtifactProvider>
                      <CodeBlockProvider>
                        <div className="markdown prose w-full dark:prose-invert max-w-none">
                          <Markdown content={acordao.sumario_ia.sumario} isLatestMessage={false} />
                        </div>
                      </CodeBlockProvider>
                    </ArtifactProvider>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Texto da Decisão */}
          <div>
            <h2 className="mb-3 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Texto da Decisão:
            </h2>
            <div className="w-full rounded-lg bg-gray-50 p-6 text-base leading-relaxed dark:bg-gray-900/50">
              <p className="whitespace-pre-wrap text-justify">{acordao.texto_decisao}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
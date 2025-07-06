import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchButton() {
  const navigate = useNavigate();

  const clickHandler = () => {
    navigate('/classical-search');
  };

  return (
    <button
      data-testid="nav-search-button"
      className="inline-flex h-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-transparent px-3 text-sm font-medium text-text-primary transition-all ease-in-out hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
      onClick={clickHandler}
    >
      Pesquisar Acórdãos
    </button>
  );
} 
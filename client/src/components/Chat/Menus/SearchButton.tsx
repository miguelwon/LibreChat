import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TooltipAnchor } from '~/components/ui';
import { useLocalize } from '~/hooks';
import { ExperimentIcon } from '~/components/svg';

export default function SearchButton() {
  const navigate = useNavigate();
  const localize = useLocalize();

  const clickHandler = () => {
    navigate('/search');
  };

  return (
    <TooltipAnchor
      description={localize('com_ui_classifical_search')}
      render={
        <button
          data-testid="nav-search-button"
          aria-label={localize('com_ui_classifical_search')}
          className="inline-flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-border-light bg-transparent text-text-primary transition-all ease-in-out hover:bg-surface-tertiary disabled:pointer-events-none disabled:opacity-50 radix-state-open:bg-surface-tertiary"
          onClick={clickHandler}
        >
          <ExperimentIcon className="icon-md md:h-6 md:w-6" />
        </button>
      }
    />
  );
} 
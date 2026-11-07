import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/start';
import { createRouter } from './router';
import { installChunkReload } from '../src/lib/reloadGuard';

// After a redeploy, old hashed chunks 404; reload once to pick up the new build.
installChunkReload();

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);

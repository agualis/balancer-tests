import { pick } from 'lodash';
import {
  computed,
  ComputedRef,
  InjectionKey,
  onBeforeMount,
  provide,
  reactive,
  ref,
  Ref,
  toRefs,
} from 'vue';

import localStorageKeys from '@/constants/local-storage.keys';
import symbolKeys from '@/constants/symbol.keys';
import { lsSet } from '@/lib/utils';
import { tokenListService } from '@/services/token-list/token-list.service';
import { TokenList, TokenListMap } from '@/types/TokenList';
import useNetwork from '@/composables/useNetwork';

/** TYPES */
export interface TokenListsState {
  activeListKeys: string[];
}

export interface TokenListsProviderResponse {
  activeListKeys: Ref<string[]>;
  tokensListPromise: Promise<any>;
  allTokenLists: Ref<TokenListMap>;
  activeTokenLists: ComputedRef<TokenListMap>;
  defaultTokenList: ComputedRef<TokenList>;
  balancerTokenLists: ComputedRef<TokenListMap>;
  approvedTokenLists: ComputedRef<TokenListMap>;
  vettedTokenList: ComputedRef<TokenList>;
  toggleTokenList: (uri: string) => void;
  isActiveList: (uri: string) => boolean;
}

/** SETUP */
const { uris } = tokenListService;
const { networkId } = useNetwork();
export const TokenListsProviderSymbol: InjectionKey<TokenListsProviderResponse> =
  Symbol(symbolKeys.Providers.TokenLists);

export default {
  name: 'TokenListsProvider',

  setup(props, { slots }) {
    /**
     * STATE
     */
    const state: TokenListsState = reactive({
      activeListKeys: [uris.Balancer.Default],
    });

    const allTokenLists = ref({});

    const tokensListPromise =
      import.meta.env.MODE === 'test'
        ? // Only use this file in testing mode (vitest)
          import('@/tests/tokenlists/tokens-5.json')
        : // Use generated file in development/production mode
          import(`@/assets/data/tokenlists/tokens-${networkId.value}.json`);

    onBeforeMount(async () => {
      const module = await tokensListPromise;
      allTokenLists.value = module.default;
    });

    /**
     * All active (toggled) tokenlists
     */
    const activeTokenLists = computed(
      (): TokenListMap => pick(allTokenLists.value, state.activeListKeys)
    );

    /**
     * The default Balancer token list.
     */
    const defaultTokenList = computed(
      (): TokenList => allTokenLists.value[uris.Balancer.Default]
    );

    /**
     * The Balancer vetted token list, contains LBP tokens.
     */
    const vettedTokenList = computed(
      (): TokenList => allTokenLists.value[uris.Balancer.Vetted]
    );

    /**
     * All Balancer token lists mapped by URI.
     */
    const balancerTokenLists = computed(
      (): TokenListMap => pick(allTokenLists.value, uris.Balancer.All)
    );

    /**
     * Approved token lists mapped by URI.
     * Approved means tokens are compliant and can be presented in the UI.
     * This excludes lists like the Balancer vetted list.
     */
    const approvedTokenLists = computed(
      (): TokenListMap => pick(allTokenLists.value, uris.Approved)
    );

    /**
     * Adds a token list to the active lists which
     * makes additonal tokens available in the token search modal.
     */
    function toggleTokenList(uri: string): void {
      if (!uris.Approved.includes(uri)) return;

      if (state.activeListKeys.includes(uri)) {
        // Deactivate token list
        state.activeListKeys.splice(state.activeListKeys.indexOf(uri), 1);
      } else {
        // Activate token list
        state.activeListKeys.push(uri);
      }

      lsSet(localStorageKeys.TokenLists.Toggled, state.activeListKeys);
    }

    /**
     * Given a token list URI checks if the related token
     * list has been toggled via the token search modal.
     */
    function isActiveList(uri: string): boolean {
      return state.activeListKeys.includes(uri);
    }

    provide(TokenListsProviderSymbol, {
      // state
      ...toRefs(state),
      // computed
      allTokenLists,
      activeTokenLists,
      defaultTokenList,
      balancerTokenLists,
      approvedTokenLists,
      vettedTokenList,
      // methods
      toggleTokenList,
      isActiveList,
      tokensListPromise,
    });

    return () => {
      return slots.default();
    };
  },
};

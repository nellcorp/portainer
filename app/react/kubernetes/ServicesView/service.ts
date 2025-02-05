import { useMutation, useQuery, useQueryClient } from 'react-query';
import { compact } from 'lodash';
import { ServiceList } from 'kubernetes-types/core/v1';

import { withError } from '@/react-tools/react-query';
import axios, { parseAxiosError } from '@/portainer/services/axios';
import { EnvironmentId } from '@/react/portainer/environments/types';
import { isFulfilled } from '@/portainer/helpers/promise-utils';

import { getNamespaces } from '../namespaces/service';

import { Service } from './types';

export const queryKeys = {
  clusterServices: (environmentId: EnvironmentId) =>
    ['environments', environmentId, 'kubernetes', 'services'] as const,
};

// get a list of services for a specific namespace from the Portainer API
async function getServices(
  environmentId: EnvironmentId,
  namespace: string,
  lookupApps: boolean
) {
  try {
    const { data: services } = await axios.get<Array<Service>>(
      `kubernetes/${environmentId}/namespaces/${namespace}/services`,
      {
        params: {
          lookupapplications: lookupApps,
        },
      }
    );
    return services;
  } catch (e) {
    throw parseAxiosError(e as Error, 'Unable to retrieve services');
  }
}

export function useServices(environmentId: EnvironmentId) {
  return useQuery(
    queryKeys.clusterServices(environmentId),
    async () => {
      const namespaces = await getNamespaces(environmentId);
      const settledServicesPromise = await Promise.allSettled(
        Object.keys(namespaces).map((namespace) =>
          getServices(environmentId, namespace, true)
        )
      );
      return compact(
        settledServicesPromise.filter(isFulfilled).flatMap((i) => i.value)
      );
    },
    withError('Unable to get services.')
  );
}

// getNamespaceServices is used to get a list of services for a specific namespace directly from the Kubernetes API
export async function getNamespaceServices(
  environmentId: EnvironmentId,
  namespace: string,
  queryParams?: Record<string, string>
) {
  const { data: services } = await axios.get<ServiceList>(
    `/endpoints/${environmentId}/kubernetes/api/v1/namespaces/${namespace}/services`,
    {
      params: queryParams,
    }
  );
  return services.items;
}

export function useMutationDeleteServices(environmentId: EnvironmentId) {
  const queryClient = useQueryClient();
  return useMutation(deleteServices, {
    onSuccess: () =>
      queryClient.invalidateQueries(queryKeys.clusterServices(environmentId)),
    ...withError('Unable to delete service(s)'),
  });
}

export async function deleteServices({
  environmentId,
  data,
}: {
  environmentId: EnvironmentId;
  data: Record<string, string[]>;
}) {
  try {
    return await axios.post(
      `kubernetes/${environmentId}/services/delete`,
      data
    );
  } catch (e) {
    throw parseAxiosError(e as Error, 'Unable to delete service(s)');
  }
}

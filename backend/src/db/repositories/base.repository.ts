import {
  DeepPartial,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
} from 'typeorm';

import { AppDataSource } from '../data-source';

export abstract class BaseRepository<
  T extends { id: number }
> {
  protected repository: Repository<T>;

  constructor(entity: EntityTarget<T>) {
    this.repository =
      AppDataSource.getRepository(entity);
  }

  protected get repo() {
    return this.repository;
  }

  async create(
    data: DeepPartial<T>
  ): Promise<T> {
    const entity =
      this.repo.create(data);

    return this.repo.save(entity);
  }

  async update(
    where: FindOptionsWhere<T>,
    data: DeepPartial<T>
  ): Promise<T | null> {
    const entity =
      await this.repo.findOne({
        where,
      });

    if (!entity) {
      return null;
    }

    const merged =
      this.repo.merge(
        entity,
        data
      );

    return this.repo.save(
      merged
    );
  }

  async findById(
    id: number
  ): Promise<T | null> {
    return this.repo.findOneBy({
      id,
    } as FindOptionsWhere<T>);
  }

  async findOne(
    options: FindOneOptions<T>
  ): Promise<T | null> {
    return this.repo.findOne(
      options
    );
  }

  async findMany(
    options?: FindManyOptions<T>
  ): Promise<T[]> {
    return this.repo.find(
      options
    );
  }

  async delete(
    where: FindOptionsWhere<T>
  ) {
    return this.repo.delete(
      where
    );
  }

  async exists(
    where: FindOptionsWhere<T>
  ): Promise<boolean> {
    const count =
      await this.repo.count({
        where,
      });

    return count > 0;
  }
}